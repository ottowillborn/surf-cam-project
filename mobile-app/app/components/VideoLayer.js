import React, { useState, useRef } from 'react';
import { Platform, View, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import styles from '../styles';

export default function VideoLayer({ isStreaming, loading, STREAM_URL }) {
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const handleWheel = (e) => {
    e.preventDefault();
    
    const zoomSpeed = 0.2;
    const nextScale = Math.min(Math.max(1, scale + (e.deltaY > 0 ? -zoomSpeed : zoomSpeed)), 6);

    // ONLY update the origin when the wheel is moved. 
    // This locks the zoom to the point where the mouse was at the moment of scrolling.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setOrigin({ x, y });
    setScale(nextScale);
  };

  return (
    <View style={styles.videoContainer}>
      {isStreaming ? (
        Platform.OS === 'web' ? (
          <View style={[styles.webVideoContainer, { width: '100%', height: '100%' }]}>
            <div 
              onWheel={handleWheel}
              style={{ 
                width: '100%', 
                height: '100%', 
                overflow: 'hidden', 
                backgroundColor: 'black',
                cursor: 'zoom-in'
              }}
            >
              <img
                src={STREAM_URL}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                  transform: `scale(${scale})`,
                  transition: 'transform 0.1s ease-out' // Smooths the zoom
                }}
              />
            </div>
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            scalesPageToFit={true}
            allowsMagnification={true}
            scrollEnabled={false} // Usually better for "covering" views
            containerStyle={{ backgroundColor: 'black' }}
            source={{
              html: `
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <style>
                      body, html { 
                        margin: 0; 
                        padding: 0;
                        background: #000; 
                        width: 100%;
                        height: 100%;
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        overflow: hidden; 
                      }
                      img { 
                        width: 100%; 
                        height: 100%; 
                        object-fit: cover; /* This forces the stream to fill the viewport */
                      }
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