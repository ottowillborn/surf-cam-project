import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { ...StyleSheet.absoluteFillObject },
  webVideoContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
