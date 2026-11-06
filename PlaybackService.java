package app.omusic.player;
import android.app.*;
import android.content.*;
import android.media.*;
import android.media.session.*;
import android.os.*;

/** Keeps playback represented in Android's media controls; Web Audio remains the master. */
public final class PlaybackService extends Service {
    static boolean running=false;
    private MediaSession session;
    private String title="OMUSIC",artist="";
    private long duration=0,position=0;
    private boolean playing=false;
    private static final String CHANNEL="omusic_playback";
    @Override public void onCreate(){
        super.onCreate();running=true;
        NotificationManager notifications=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        notifications.createNotificationChannel(new NotificationChannel(CHANNEL,"Reproducción de OMUSIC",NotificationManager.IMPORTANCE_LOW));
        session=new MediaSession(this,"OMUSIC");session.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS|MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        session.setCallback(new MediaSession.Callback(){
            @Override public void onPlay(){MainActivity.mediaCommand("play",0);}
            @Override public void onPause(){MainActivity.mediaCommand("pause",0);}
            @Override public void onSkipToNext(){MainActivity.mediaCommand("next",0);}
            @Override public void onSkipToPrevious(){MainActivity.mediaCommand("previous",0);}
            @Override public void onSeekTo(long position){MainActivity.mediaCommand("seek",position);}
            @Override public void onStop(){MainActivity.mediaCommand("pause",0);stopSelf();}
        });session.setActive(true);
    }
    private PendingIntent action(String value){return PendingIntent.getService(this,value.hashCode(),new Intent(this,PlaybackService.class).setAction(value),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);}
    private Notification notification(){
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_media_play).setContentTitle(title).setContentText(artist).setContentIntent(open).setOngoing(playing).setVisibility(Notification.VISIBILITY_PUBLIC).setOnlyAlertOnce(true)
        .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_previous,"Anterior",action("previous")).build())
        .addAction(new Notification.Action.Builder(playing?android.R.drawable.ic_media_pause:android.R.drawable.ic_media_play,playing?"Pausar":"Reproducir",action(playing?"pause":"play")).build())
        .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next,"Siguiente",action("next")).build())
        .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0,1,2)).build();
    }
    @Override public int onStartCommand(Intent intent,int flags,int id){
        if(intent==null){stopSelf();return START_NOT_STICKY;}
        String action=intent.getAction();if(!"update".equals(action)){MainActivity.mediaCommand(action,0);return START_NOT_STICKY;}
        title=intent.getStringExtra("title");artist=intent.getStringExtra("artist");duration=Math.max(0,intent.getLongExtra("duration",0));position=Math.max(0,intent.getLongExtra("position",0));playing=intent.getBooleanExtra("playing",false);
        session.setMetadata(new MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE,title).putString(MediaMetadata.METADATA_KEY_ARTIST,artist).putLong(MediaMetadata.METADATA_KEY_DURATION,duration).build());
        session.setPlaybackState(new PlaybackState.Builder().setActions(PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PAUSE|PlaybackState.ACTION_SKIP_TO_NEXT|PlaybackState.ACTION_SKIP_TO_PREVIOUS|PlaybackState.ACTION_SEEK_TO|PlaybackState.ACTION_STOP).setState(playing?PlaybackState.STATE_PLAYING:PlaybackState.STATE_PAUSED,position,playing?1f:0f).build());
        if(playing){
            startForeground(7,notification());
        }else{stopForeground(false);((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(7,notification());}
        return START_NOT_STICKY;
    }
    @Override public IBinder onBind(Intent intent){return null;}
    @Override public void onDestroy(){running=false;session.release();((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).cancel(7);super.onDestroy();}
}
