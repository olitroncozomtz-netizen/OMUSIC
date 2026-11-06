package app.omusic.player;

import android.app.*;
import android.content.*;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.util.Base64;
import android.util.Rational;
import android.view.*;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.*;
import java.lang.ref.WeakReference;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.*;
import javax.crypto.*;
import javax.crypto.spec.*;

/** The web app is bundled. Only its top-level document can invoke native actions. */
public final class MainActivity extends Activity {
    static final String ORIGIN="https://appassets.androidplatform.net";
    static final String ENTRY=ORIGIN+"/assets/www/index.html";
    static final String WEBSITE="https://omusic-oliver-player.epictrail4101.chatgpt.site/";
    static WeakReference<MainActivity> active=new WeakReference<>(null);
    private WebView web;
    private FrameLayout container;
    private View customView;
    private WebChromeClient.CustomViewCallback customCallback;
    private ValueCallback<Uri[]> fileCallback;
    private KeyPair authKeys;
    private String authState,authProvider;
    private long authStarted;
    private boolean notificationAsked=false;
    private static final int PICK=40;
    private String website(){return getPreferences(MODE_PRIVATE).getString("website",WEBSITE);}
    private void configureWebsite(){
        android.widget.EditText input=new android.widget.EditText(this);input.setSingleLine(true);input.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);input.setText(website());
        new AlertDialog.Builder(this).setTitle("Sitio web de OMUSIC").setMessage("Pon la dirección completa de tu página publicada. Se usa para compartir y para abrir Google o GitHub en el navegador.").setView(input).setNegativeButton("Cancelar",null).setPositiveButton("Guardar",(dialog,which)->{
            String value=input.getText().toString().trim();Uri uri=Uri.parse(value);
            if(!"https".equals(uri.getScheme())||uri.getHost()==null||uri.getHost().equals("appassets.androidplatform.net")||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||uri.getPort()!=-1||value.length()>2000){Toast.makeText(this,"Usa una dirección HTTPS, sin parámetros ni fragmentos.",Toast.LENGTH_LONG).show();return;}
            if(value.endsWith("index.html"))value=value.substring(0,value.length()-10);if(!value.endsWith("/"))value+="/";
            clearAuth();getPreferences(MODE_PRIVATE).edit().putString("website",value).apply();callJS("OMAndroidAuth.cancel();OMAndroid.publicBase="+JSONObject.quote(value)+";window.omToast&&omToast('Dirección guardada.');");
        }).show();
    }

    @Override public void onCreate(Bundle state){
        super.onCreate(state);active=new WeakReference<>(this);
        getWindow().setStatusBarColor(Color.rgb(17,24,22));
        getWindow().setNavigationBarColor(Color.rgb(17,24,22));
        if(Build.VERSION.SDK_INT>=35){
            // Android 15 enforces edge-to-edge. Keep the HTML clear of system bars/keyboard.
            getWindow().getDecorView().setOnApplyWindowInsetsListener((view,insets)->{
                android.graphics.Insets safe=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());
                view.setPadding(safe.left,safe.top,safe.right,safe.bottom);return insets;
            });
        }
        container=new FrameLayout(this);web=new WebView(this);container.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(container);
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(false);s.setSafeBrowsingEnabled(true);s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(false);s.setBuiltInZoomControls(false);s.setDisplayZoomControls(false);
        web.setBackgroundColor(Color.rgb(17,24,22));WebView.setWebContentsDebuggingEnabled(false);
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest request){
                Uri uri=request.getUrl();if(!"appassets.androidplatform.net".equals(uri.getHost()))return null;
                String path=uri.getPath();
                if(!"https".equals(uri.getScheme())||path==null||!path.startsWith("/assets/www/")||path.contains("..")||path.contains("\\"))return missing();
                String name=path.substring("/assets/".length());if(name.endsWith("/"))name+="index.html";
                try{
                    WebResourceResponse response=new WebResourceResponse(mime(name),"UTF-8",getAssets().open(name));
                    java.util.Map<String,String> headers=new java.util.HashMap<>();headers.put("X-Content-Type-Options","nosniff");headers.put("Cache-Control","no-cache");response.setResponseHeaders(headers);return response;
                }catch(IOException error){return missing();}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){
                if(!request.isForMainFrame())return false;
                Uri uri=request.getUrl();if(isAppPage(uri.toString()))return false;
                if("omusic-auth".equals(uri.getScheme())){completeAuth(uri);return true;}
                if("https".equals(uri.getScheme())||"http".equals(uri.getScheme())||"mailto".equals(uri.getScheme()))external(uri);
                return true;
            }
            @Override public void onPageFinished(WebView v,String url){if(isAppPage(url))deliverStartupRoute(getIntent());}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onJsPrompt(WebView v,String url,String message,String defaultValue,JsPromptResult result){
                if(message==null||!message.startsWith("omusic-native:"))return false;
                if(!isAppPage(url)||!isAppPage(v.getUrl())||message.length()>24000){result.cancel();return true;}
                try{result.confirm(nativeAction(new JSONObject(message.substring(14))).toString());}catch(Exception error){result.confirm("{\"ok\":false}");}return true;
            }
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(!isAppPage(v.getUrl()))return false;if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                Intent picker=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*");
                try{startActivityForResult(picker,PICK);}catch(ActivityNotFoundException error){callback.onReceiveValue(null);fileCallback=null;}return true;
            }
            @Override public void onShowCustomView(View view,CustomViewCallback callback){
                if(customView!=null){callback.onCustomViewHidden();return;}customView=view;customCallback=callback;
                web.setVisibility(View.GONE);container.addView(view,new FrameLayout.LayoutParams(-1,-1));
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN|WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            }
            @Override public void onHideCustomView(){hideFullScreen();}
            @Override public boolean onCreateWindow(WebView v,boolean dialog,boolean userGesture,Message message){
                if(!userGesture)return false;
                WebView popup=new WebView(MainActivity.this);popup.setWebViewClient(new WebViewClient(){
                    @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){external(request.getUrl());view.destroy();return true;}
                });
                ((WebView.WebViewTransport)message.obj).setWebView(popup);message.sendToTarget();return true;
            }
        });
        // The app never navigates its privileged WebView to remote pages.
        web.loadUrl(ENTRY);
    }
    private static String mime(String name){
        if(name.endsWith(".js")||name.endsWith(".mjs"))return "text/javascript";
        if(name.endsWith(".html"))return "text/html";if(name.endsWith(".css"))return "text/css";
        if(name.endsWith(".svg"))return "image/svg+xml";
        String ext=MimeTypeMap.getFileExtensionFromUrl(name),value=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);return value==null?"application/octet-stream":value;
    }
    private static WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,new ByteArrayInputStream(new byte[0]));}
    private static boolean isAppPage(String value){
        if(value==null)return false;Uri u=Uri.parse(value);return "https".equals(u.getScheme())&&"appassets.androidplatform.net".equals(u.getHost())&&u.getPort()==-1&&"/assets/www/index.html".equals(u.getPath());
    }
    private void external(Uri uri){
        if(!java.util.Arrays.asList("https","http","mailto").contains(uri.getScheme()))return;
        try{startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE));}catch(ActivityNotFoundException error){Toast.makeText(this,"Instala un navegador para abrir este enlace.",Toast.LENGTH_LONG).show();}
    }
    private JSONObject nativeAction(JSONObject data)throws Exception{
        JSONObject response=new JSONObject().put("ok",true);
        switch(data.optString("action")){
            case "capabilities":return response.put("website",website()).put("pip",getPackageManager().hasSystemFeature("android.software.picture_in_picture")).put("version","1.0.0");
            case "share":{
                String url=data.optString("url");Uri parsed=Uri.parse(url);
                if(url.length()>6000||!"https".equals(parsed.getScheme())||!Uri.parse(website()).getHost().equals(parsed.getHost()))return response.put("ok",false);
                Intent send=new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,data.optString("title","OMUSIC")+"\n"+url);
                startActivity(Intent.createChooser(send,"Compartir con…"));return response;
            }
            case "copy":{
                String text=data.optString("text");if(text.length()>10000)return response.put("ok",false);
                ((android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("OMUSIC",text));return response;
            }
            case "login":return beginAuth(data.optString("provider"));
            case "cancelAuth":clearAuth();return response;
            case "configureWebsite":configureWebsite();return response;
            case "pip":{
                if(customView!=null)hideFullScreen();
                boolean entered=enterPictureInPictureMode(new PictureInPictureParams.Builder().setAspectRatio(new Rational(16,9)).build());return response.put("ok",entered);
            }
            case "media":{
                boolean playing=data.optBoolean("playing");
                if(playing&&Build.VERSION.SDK_INT>=33&&!notificationAsked){notificationAsked=true;if(checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},41);}
                Intent service=new Intent(this,PlaybackService.class).setAction("update").putExtra("title",data.optString("title","OMUSIC")).putExtra("artist",data.optString("artist","")).putExtra("playing",playing).putExtra("position",data.optLong("position",0)).putExtra("duration",data.optLong("duration",0));
                if(playing)startForegroundService(service);else if(PlaybackService.running)startService(service);
                if(playing)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);return response;
            }
            default:return response.put("ok",false);
        }
    }
    private static String encode(byte[] bytes){return Base64.encodeToString(bytes,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING);}
    private static byte[] decode(String text){if(text==null||text.length()>18000)throw new IllegalArgumentException();return Base64.decode(text,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING);}
    private JSONObject beginAuth(String provider)throws Exception{
        if(!"google".equals(provider)&&!"github".equals(provider))throw new IllegalArgumentException();
        clearAuth();KeyPairGenerator gen=KeyPairGenerator.getInstance("EC");gen.initialize(new ECGenParameterSpec("secp256r1"));authKeys=gen.generateKeyPair();
        byte[] nonce=new byte[32];new SecureRandom().nextBytes(nonce);authState=encode(nonce);authProvider=provider;authStarted=SystemClock.elapsedRealtime();
        String fragment="state="+authState+"&pub="+encode(authKeys.getPublic().getEncoded())+"&provider="+provider;
        external(Uri.parse(website()+"android-auth.html#"+fragment));return new JSONObject().put("ok",true).put("state",authState);
    }
    private void clearAuth(){authKeys=null;authState=null;authProvider=null;authStarted=0;}
    private void completeAuth(Uri uri){
        if(!"omusic-auth".equals(uri.getScheme())||!"callback".equals(uri.getHost())||authKeys==null||!isAppPage(web.getUrl()))return;
        String state=uri.getQueryParameter("state");
        if(state==null||!MessageDigest.isEqual(state.getBytes(StandardCharsets.UTF_8),authState.getBytes(StandardCharsets.UTF_8))||SystemClock.elapsedRealtime()-authStarted>600000)return;
        KeyPair keys=authKeys;String provider=authProvider;clearAuth();
        try{
            PublicKey pub=KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(decode(uri.getQueryParameter("pub"))));
            if(!(pub instanceof java.security.interfaces.ECPublicKey)||((java.security.interfaces.ECPublicKey)pub).getParams().getCurve().getField().getFieldSize()!=256)throw new GeneralSecurityException();
            KeyAgreement agreement=KeyAgreement.getInstance("ECDH");agreement.init(keys.getPrivate());agreement.doPhase(pub,true);
            byte[] secret=agreement.generateSecret();MessageDigest digest=MessageDigest.getInstance("SHA-256");digest.update(secret);byte[] aes=digest.digest(state.getBytes(StandardCharsets.UTF_8));
            byte[] iv=decode(uri.getQueryParameter("iv"));if(iv.length!=12)throw new GeneralSecurityException();
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(aes,"AES"),new GCMParameterSpec(128,iv));cipher.updateAAD(state.getBytes(StandardCharsets.UTF_8));
            JSONObject credential=new JSONObject(new String(cipher.doFinal(decode(uri.getQueryParameter("data"))),StandardCharsets.UTF_8));
            if(!provider.equals(credential.optString("provider")))throw new GeneralSecurityException();
            JSONObject response=new JSONObject().put("state",state).put("credential",credential);
            callJS("window.OMAndroidAuth&&OMAndroidAuth.receive("+response.toString()+")");
        }catch(Exception error){callJS("window.OMAndroidAuth&&OMAndroidAuth.failed()");}
    }
    static void mediaCommand(String action,long position){
        MainActivity activity=active.get();if(activity==null)return;
        activity.runOnUiThread(()->activity.callJS("window.OMAndroid&&OMAndroid.mediaCommand("+JSONObject.quote(action)+","+position+")"));
    }
    private void callJS(String script){if(web!=null&&isAppPage(web.getUrl()))web.evaluateJavascript(script,null);}
    private void deliverStartupRoute(Intent intent){
        if(intent==null)return;String route=intent.getStringExtra("route");if(route==null||route.length()>6000)return;
        intent.removeExtra("route");if(route.matches("^#(track|album|artist|video|profile|playlist|party)=.*"))callJS("location.hash="+JSONObject.quote(route));
    }
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);if(intent.getData()!=null)completeAuth(intent.getData());deliverStartupRoute(intent);}
    @Override protected void onResume(){super.onResume();active=new WeakReference<>(this);if(web!=null&&authKeys!=null&&SystemClock.elapsedRealtime()-authStarted>1500)callJS("window.OMAndroidAuth&&OMAndroidAuth.returned()");}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==PICK&&fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileCallback=null;}}
    private void hideFullScreen(){
        if(customView==null)return;container.removeView(customView);customView=null;web.setVisibility(View.VISIBLE);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        if(customCallback!=null){customCallback.onCustomViewHidden();customCallback=null;}
    }
    @Override public void onBackPressed(){
        if(customView!=null){hideFullScreen();return;}
        if(isInPictureInPictureMode()){super.onBackPressed();return;}
        web.evaluateJavascript("window.OMAndroid?OMAndroid.back():false",value->{if(!"true".equals(value))moveTaskToBack(true);});
    }
    @Override public void onPictureInPictureModeChanged(boolean active,Configuration config){super.onPictureInPictureModeChanged(active,config);callJS("document.body.classList.toggle('om-android-pip',"+active+")");}
    @Override protected void onDestroy(){if(isFinishing()){stopService(new Intent(this,PlaybackService.class));web.destroy();clearAuth();}super.onDestroy();}
}
