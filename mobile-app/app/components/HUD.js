import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles';
import ShutterButton from './ShutterButton';
import appJson from '../../app.json';

export default function HUD({ stats, isStreaming, onToggle }) {
  const version = appJson?.expo?.version ?? appJson?.version ?? '?';
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.hudHeader} pointerEvents="box-none">
        <View style={styles.liveIndicator}>
          <View style={[styles.dot, { backgroundColor: isStreaming ? '#FF3B30' : '#555' }]} />
          <Text style={styles.liveText}>{isStreaming ? 'LIVE' : 'STANDBY'}</Text>
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
