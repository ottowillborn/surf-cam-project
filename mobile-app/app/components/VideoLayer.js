import React from 'react';
import { Platform, View, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import styles from '../styles';

export default function VideoLayer({ isStreaming, loading, STREAM_URL }) {
  return (
    <View style={styles.videoContainer}>
      {isStreaming ? (
        Platform.OS === 'web' ? (
          <View style={styles.webVideoContainer}>
            <img
              src={STREAM_URL}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'cover',
                transform: 'rotate(180deg)',
                display: 'block'
              }}
            />
          </View>
        ) : (
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
          <Text style={styles.placeholderText}>{loading ? 'ESTABLISHING HANDSHAKE...' : 'NO SIGNAL'}</Text>
        </View>
      )}
    </View>
  );
}
