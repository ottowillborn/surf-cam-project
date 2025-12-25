import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  const PI_IP = 'opi.tail5cc970.ts.net'; 
  const STREAM_URL = `https://${PI_IP}:5000/video_feed`;
  const CONTROL_URL = `https://${PI_IP}:5001`;

  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ temp: "--", cpu_usage: "--", uptime: "--" });

  const fetchDiagnostics = async () => {
    try {
      const response = await fetch(`${CONTROL_URL}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (e) { console.log("Stats failed"); }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleStream = async (command) => {
    if (command === 'stop') {
      await fetch(`${CONTROL_URL}/stop`, { method: 'POST' });
      setIsStreaming(false);
      return;
    }
    setLoading(true);
    try {
      await fetch(`${CONTROL_URL}/start`, { method: 'POST' });
      let ready = false;
      let attempts = 0;
      while (!ready && attempts < 15) {
        try {
          const check = await fetch(`https://${PI_IP}:5000/health`);
          if (check.ok) ready = true;
        } catch (e) {
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
        }
      }
      setIsStreaming(ready);
    } catch (error) {
      Alert.alert("Error", "Controller unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* 1. THE VIDEO LAYER */}
      <View style={styles.videoContainer}>
        {isStreaming ? (
        Platform.OS === 'web' ? (
          /* WEB VIEW: Direct Image/Iframe for Browser Support */
          <View style={styles.webVideoContainer}>
            <img 
                src={STREAM_URL} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  objectFit: 'cover', // This prevents the cutoff
                  transform: 'rotate(180deg)',
                  display: 'block'
                }} 
            />
          </View>
        ) : (
          /* MOBILE VIEW: Uses Native WebView */
          <WebView
            originWhitelist={['*']}
            scalesPageToFit={true}
            allowsMagnification={true}
            scrollEnabled={true}
            containerStyle={{ backgroundColor: 'black' }}
            source={{
              html: `
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
                    <style>
                      body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: auto; }
                      img { max-width: 100%; max-height: 100%; object-fit: contain; transform: rotate(180deg); }
                    </style>
                  </head>
                  <body><img src="${STREAM_URL}" /></body>
                </html>
              `
            }}
          />
        )
      ) : (
        <View style={styles.placeholder}>
          <ActivityIndicator animating={loading} size="large" color="#444" />
          <Text style={styles.placeholderText}>
            {loading ? "ESTABLISHING HANDSHAKE..." : "NO SIGNAL"}
          </Text>
        </View>
      )}
      </View>

      {/* 2. THE HUD LAYER (Heads-Up Display) */}
      {/* pointerEvents="box-none" is critical so gestures pass through to the WebView */}
      <View style={styles.overlay} pointerEvents="box-none">
        
        {/* Top Data Bar */}
        <View style={styles.hudHeader} pointerEvents="box-none">
          <View style={styles.liveIndicator}>
             <View style={[styles.dot, { backgroundColor: isStreaming ? '#FF3B30' : '#555' }]} />
             <Text style={styles.liveText}>{isStreaming ? "LIVE" : "STANDBY"}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.statLink}>CPU {stats.cpu_usage}%</Text>
            <Text style={[styles.statLink, { color: parseFloat(stats.temp) > 70 ? '#FF3B30' : '#00FF00' }]}>
              {stats.temp}°C
            </Text>
          </View>
        </View>

        {/* Bottom Control Bar */}
        <View style={styles.hudFooter} pointerEvents="box-none">
          <Text style={styles.uptime}>SYS_UP: {stats.uptime}</Text>
          <TouchableOpacity 
            activeOpacity={0.7}
            style={[styles.shutterBtn, isStreaming && styles.shutterBtnActive]} 
            onPress={() => toggleStream(isStreaming ? 'stop' : 'start')}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { ...StyleSheet.absoluteFillObject },
  webVideoContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    // Remove overflow: 'hidden' if it was there
  },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#333', fontSize: 12, fontWeight: 'bold', letterSpacing: 4 },
  
  overlay: { ...StyleSheet.absoluteFillObject, padding: 30, justifyContent: 'space-between' },
  
  hudHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  liveText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  
  statsRow: { flexDirection: 'row', gap: 15 },
  statLink: { color: '#fff', fontSize: 10, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },

  hudFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  uptime: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'monospace' },
  
  shutterBtn: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center', padding: 4
  },
  shutterBtnActive: { borderColor: '#FF3B30' },
  shutterInner: { flex: 1, width: '100%', borderRadius: 30, backgroundColor: '#fff' }
});