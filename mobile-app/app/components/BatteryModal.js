import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, Text, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const chartConfig = (color) => ({
  backgroundColor: "#000",
  backgroundGradientFrom: "#1a1a1a",
  backgroundGradientTo: "#000",
  decimalPlaces: 1,
  color: (opacity = 1) => color.replace("1)", `${opacity})`),
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  propsForDots: { r: "2", strokeWidth: "1", stroke: color },
  propsForBackgroundLines: { stroke: "#333" },
});

export default function BatteryModal({ visible, onClose, controlUrl }) {
  //Date State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHistoryData = async (date) => {
    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await fetch(`${controlUrl}/history/day?date=${dateStr}`);
      const data = await response.json();
      setHistoryData(data);
    } catch (e) {
      console.log("Failed to fetch history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchHistoryData(selectedDate);
  }, [selectedDate, visible]);

  const getCharts = (data) => {
    if (!data || !data.data || data.data.length === 0) return [];
    const labels = data.data.map((d, idx) => (idx % 10 === 0 ? d.time : ""));
    return [
      { title: "State of Charge (%)", color: "rgba(0, 255, 0, 1)", key: 'soc', data: data.data.map(d => d.soc || 0) },
      { title: "Voltage (V)", color: "rgba(255, 204, 0, 1)", key: 'v', data: data.data.map(d => d.v || 0) },
      { title: "Current (A)", color: "rgba(0, 122, 255, 1)", key: 'i', data: data.data.map(d => d.i || 0) },
    ].map(chart => ({
      ...chart,
      chartData: { labels, datasets: [{ data: chart.data }] }
    }));
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Header */}
        <View style={{ paddingTop: 40, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={onClose}><Text style={{ color: "#fff", fontSize: 16 }}>← Close</Text></TouchableOpacity>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>Battery History</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Date Picker */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 20 }}>
          <TouchableOpacity onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} style={{ padding: 10, backgroundColor: "#222" }}>
            <Text style={{ color: "#fff" }}>Prev</Text>
          </TouchableOpacity>
          <Text style={{ color: "#fff", alignSelf: 'center' }}>{selectedDate.toDateString()}</Text>
          <TouchableOpacity onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} style={{ padding: 10, backgroundColor: "#222" }}>
            <Text style={{ color: "#fff" }}>Next</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {loading ? (
            <ActivityIndicator size="large" color="#666" style={{ marginTop: 50 }} />
          ) : historyData?.data ? (
            <View style={{ paddingBottom: 40 }}>
              {getCharts(historyData).map((chart, index) => (
                <View key={index} style={{ marginBottom: 30 }}>
                  <Text style={{ color: "#fff", fontSize: 16, marginLeft: 20, marginBottom: 10 }}>{chart.title}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={chart.chartData}
                      width={screenWidth * 1.5}
                      height={220}
                      chartConfig={chartConfig(chart.color)}
                      bezier
                      fromZero={chart.key === 'i'}
                      getDotColor={(val) => chart.key === 'i' ? (val < 0 ? "#ff3b30" : "#007aff") : chart.color}
                      style={{ borderRadius: 16, marginHorizontal: 10 }}
                    />
                  </ScrollView>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: "#666", textAlign: 'center', marginTop: 50 }}>No data available</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}