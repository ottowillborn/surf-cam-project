import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import styles from '../styles';

export default function ShutterButton({ isStreaming, onToggle }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.shutterBtn, isStreaming && styles.shutterBtnActive]}
      onPress={() => onToggle(isStreaming ? 'stop' : 'start')}
    >
      <View style={styles.shutterInner} />
    </TouchableOpacity>
  );
}
