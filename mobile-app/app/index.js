import React, { useEffect, useState } from 'react';
import { View, StatusBar, Alert } from 'react-native';
import VideoLayer from './components/VideoLayer';
import HUD from './components/HUD';
import BatteryModal from './components/BatteryModal'; // Import the new component
import styles from './styles';

const PI_IP = 'opi-1.tail5cc970.ts.net';
const STREAM_URL = `https://${PI_IP}:5000/video_feed`;
const CONTROL_URL = `https://${PI_IP}:5001`;

export default function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({ temp: '--', cpu_usage: '--', uptime: '--' });

  const fetchDiagnostics = async () => {
    try {
      const response = await fetch(`${CONTROL_URL}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (e) { console.log('Stats failed'); }
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
      let ready = false, attempts = 0;
      while (!ready && attempts < 15) {
        try {
          const check = await fetch(`https://${PI_IP}:5000/health`);
          if (check.ok) ready = true;
        } catch (e) {
          await new Promise((r) => setTimeout(r, 1000));
          attempts++;
        }
      }
      setIsStreaming(ready);
    } catch (error) {
      Alert.alert('Error', 'Controller unreachable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <VideoLayer isStreaming={isStreaming} loading={loading} STREAM_URL={STREAM_URL} />
      
      <HUD 
        stats={stats} 
        isStreaming={isStreaming} 
        onToggle={toggleStream} 
        onOpenHistory={() => setModalVisible(true)} 
      />

      <BatteryModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        controlUrl={CONTROL_URL}
      />
    </View>
  );
}