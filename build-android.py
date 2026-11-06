#!/usr/bin/env python3
"""Build OMUSIC with the official Android SDK, ECJ, and a persistent signing key.
No Gradle/network is needed at build time. See README.md for tool preparation.
"""
import argparse
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import zipfile

parser=argparse.ArgumentParser()
parser.add_argument('--sdk-tools',required=True,type=Path)
parser.add_argument('--android-jar',required=True,type=Path)
parser.add_argument('--ecj',required=True,type=Path)
parser.add_argument('--web',required=True,type=Path,help='Flat, tested website directory')
parser.add_argument('--keystore',required=True,type=Path)
parser.add_argument('--output',required=True,type=Path)
parser.add_argument('--work',required=True,type=Path)
args=parser.parse_args()
source=Path(__file__).resolve().parent
for directory in ['classes','compiled','generated']:(args.work/directory).mkdir(parents=True,exist_ok=True)
def run(*command):subprocess.run([str(part) for part in command],check=True)
resources_dir=source/'res'
java_sources=sorted((source/'src').rglob('*.java'))
if not resources_dir.exists():
    resources_dir=args.work/'flat-res'
    for sub,name in [('values','styles.xml'),('drawable','ic_launcher.xml')]:
        (resources_dir/sub).mkdir(parents=True,exist_ok=True)
        shutil.copyfile(source/name,resources_dir/sub/name)
    java_sources=[source/'MainActivity.java',source/'PlaybackService.java']
run(args.sdk_tools/'aapt2','compile','--dir',resources_dir,'-o',args.work/'compiled/resources.zip')
resources=args.work/'resources.apk'
run(args.sdk_tools/'aapt2','link','-o',resources,'-I',args.android_jar,'--manifest',source/'AndroidManifest.xml','--java',args.work/'generated',args.work/'compiled/resources.zip')
run('java','-jar',args.ecj,'-8','-nowarn','-classpath',args.android_jar,'-d',args.work/'classes',*java_sources)
run('java','-cp',args.sdk_tools/'lib/d8.jar','com.android.tools.r8.D8','--release','--min-api','26','--lib',args.android_jar,'--output',args.work/'compiled',*sorted((args.work/'classes').rglob('*.class')))
unsigned=args.work/'unsigned.apk'
shutil.copyfile(resources,unsigned)
with zipfile.ZipFile(unsigned,'a',zipfile.ZIP_DEFLATED) as archive:
    archive.write(args.work/'compiled/classes.dex','classes.dex')
    for file in sorted(args.web.iterdir()):
        if file.is_file() and not file.name.endswith(('.cjs','.jks','.apk','.zip','.java','.py','.xml')):
            archive.write(file,'assets/www/'+file.name)
    # It is a packaged website, with no network dependency for its HTML/JS/CSS.
    assert archive.read('assets/www/index.html')== (args.web/'index.html').read_bytes()
aligned=args.work/'aligned.apk'
run(args.sdk_tools/'zipalign','-f','-p','4',unsigned,aligned)
args.output.parent.mkdir(parents=True,exist_ok=True)
password=os.environ.get('OMUSIC_KEYSTORE_PASSWORD','android')
# Password goes through stdin/environment rather than process arguments.
os.environ['OMUSIC_BUILD_KEY_PASSWORD']=password
run('java','-jar',args.sdk_tools/'lib/apksigner.jar','sign','--ks',args.keystore,'--ks-key-alias','omusic','--ks-pass','env:OMUSIC_BUILD_KEY_PASSWORD','--key-pass','env:OMUSIC_BUILD_KEY_PASSWORD','--out',args.output,aligned)
run('java','-jar',args.sdk_tools/'lib/apksigner.jar','verify','--verbose','--print-certs',args.output)
run(args.sdk_tools/'zipalign','-c','-p','4',args.output)
with zipfile.ZipFile(args.output) as archive:
    assert archive.testzip() is None
    assert len(archive.read('classes.dex'))>1000
    for file in args.web.iterdir():
        if file.suffix in ['.js','.css','.html','.svg','.png','.json']:
            assert archive.read('assets/www/'+file.name)==file.read_bytes(),file.name
print('APK:',args.output)
print('SHA256:',hashlib.sha256(args.output.read_bytes()).hexdigest())
