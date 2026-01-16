import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { LineChart } from "react-native-chart-kit";

const PI_IP = "opi-1.tail5cc970.ts.net";
const CONTROL_URL = `https://${PI_IP}:5001`;
const screenWidth = Dimensions.get("window").width;

export default function BatteryModal() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHistoryData = async (date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      
      const response = await fetch(`${CONTROL_URL}/history/day?date=${dateStr}`);
      const data = await response.json();
      setHistoryData(data);
    } catch (e) {
      console.log("Failed to fetch history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData(selectedDate);
  }, [selectedDate]);

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Helper to create individual chart configurations
  const getCharts = () => {
    if (!historyData || !historyData.data || historyData.data.length === 0) return null;

    const labels = historyData.data.map((d, idx) => (idx % 5 === 0 ? d.time : ""));

    return [
      {
        title: "State of Charge (%)",
        color: "rgba(0, 255, 0, 1)", // Green
        key: 'soc',
        data: {
          labels,
          datasets: [{ data: historyData.data.map((d) => d.soc || 0) }],
        },
      },
      {
        title: "Voltage (V)",
        color: "rgba(255, 204, 0, 1)", // Yellow/Gold
        key: 'v',
        data: {
          labels,
          datasets: [{ data: historyData.data.map((d) => d.v || 0) }],
        },
      },
      {
        title: "Current (A)",
        color: "rgba(0, 122, 255, 1)", // Blue for Charging
        key: 'c',
        data: {
          labels,
          datasets: [{ 
            data: historyData.data.map((d) => d.i || 0),
            negativeColor: "rgba(255, 59, 48, 1)" // Red for Discharging
          }],
        },
      },
    ];
  };

  const charts = getCharts();

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

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Header */}
      <View style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 5 }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>Battery History</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Date Navigation */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 15 }}>
        <TouchableOpacity onPress={handlePreviousDay} style={{ padding: 10, backgroundColor: "#333", borderRadius: 5 }}>
          <Text style={{ color: "#fff", fontSize: 16 }}>← Prev</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{formatDate(selectedDate)}</Text>
        <TouchableOpacity onPress={handleNextDay} style={{ padding: 10, backgroundColor: "#333", borderRadius: 5 }}>
          <Text style={{ color: "#fff", fontSize: 16 }}>Next →</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }}>
        {loading ? (
          <View style={{ justifyContent: "center", alignItems: "center", height: 300 }}>
            <ActivityIndicator size="large" color="#666" />
          </View>
        ) : charts ? (
          <View style={{ paddingBottom: 40 }}>
            {charts.map((chart, index) => (
              <View key={index} style={{ marginBottom: 30 }}>
                <Text style={{ color: "#fff", fontSize: 16, marginLeft: 20, marginBottom: 10, fontWeight: "600" }}>
                  {chart.title}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={chart.data}
                    width={screenWidth * 1.5}
                    height={220}
                    chartConfig={chartConfig(chart.color, chart.title === "Current (A)" ? 3 : 1)}
                    bezier
                    fromZero={chart.title === "Current (A)"} 
                    style={{ borderRadius: 16, marginHorizontal: 10 }}
                    
                    // CONDITIONAL COLORING FOR DOTS
                    getDotColor={(value) => {
                      if (chart.title === "Current (A)") {
                        return value < 0 ? "#ff3b30" : "#007aff"; // Red if negative, Blue if positive
                      }
                      return chart.color;
                    }}
                  />
                </ScrollView>
              </View>
            ))}
            <Text style={{ color: "#888", fontSize: 12, textAlign: "center" }}>
              Data points: {historyData.count}
            </Text>
          </View>
        ) : (
          <View style={{ justifyContent: "center", alignItems: "center", height: 300 }}>
            <Text style={{ color: "#666", fontSize: 14 }}>No data available for this date</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}