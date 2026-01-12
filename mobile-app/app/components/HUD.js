import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles';
import ShutterButton from './ShutterButton';
import appJson from '../../app.json';

export default function HUD({ stats, isStreaming, onToggle }) {
  const version = appJson?.expo?.version ?? appJson?.version ?? '?';
  
  // Extract battery data with defaults to prevent crashes if stats aren't loaded yet
  const battery = stats?.battery || { percentage: 0, voltage: 0, current: 0, status: 'Unknown' };
  
  // Helper for color coding the battery percentage
  const getBatteryColor = (percent) => {
    if (percent > 50) return '#00FF00'; // Green
    if (percent > 20) return '#FFCC00'; // Orange/Yellow
    return '#FF3B30'; // Red
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.hudHeader} pointerEvents="box-none">
        <View style={styles.liveIndicator}>
          <View style={[styles.dot, { backgroundColor: isStreaming ? '#FF3B30' : '#555' }]} />
          <Text style={styles.liveText}>{isStreaming ? 'LIVE' : 'STANDBY'}</Text>
        </View>

        {/* --- New Battery Monitor Section --- */}
        <View style={styles.statsRow}>
           <Text style={[styles.statLink, { color: getBatteryColor(battery.percentage) }]}>
            {battery.percentage}%
          </Text>
          <Text style={[styles.statLink, { color: battery.status === 'Charging' ? '#00FF00' : '#FF3B30' }]}>
            {battery.status === 'Charging' ? '▲' : '▼'} {Math.abs(battery.current).toFixed(2)}A
          </Text>
          <Text style={styles.statLink}>{battery.voltage}V</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statLink}>CPU {stats.cpu_usage}%</Text>
          <Text style={[styles.statLink, { color: parseFloat(stats.temp) > 70 ? '#FF3B30' : '#00FF00' }]}>
            {stats.temp}°C
          </Text>
        </View>
      </View>

      <View style={styles.hudFooter} pointerEvents="box-none">
        <View>
          <Text style={styles.uptime}>SYS_UP: {stats.uptime}</Text>
          <Text style={styles.uptime}>v{version}</Text>
        </View>
        <ShutterButton isStreaming={isStreaming} onToggle={onToggle} />
      </View>
    </View>
  );
}