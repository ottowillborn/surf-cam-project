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

  // Fetch battery history for the selected date
  const fetchHistoryData = async (date) => {
    setLoading(true);
    try {
      // Format date in local timezone (YYYY-MM-DD)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      
      const response = await fetch(
        `${CONTROL_URL}/history/day?date=${dateStr}`
      );
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

  // Navigate to previous day
  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next day
  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Prepare chart data from history
  const prepareChartData = () => {
    if (!historyData || !historyData.data || historyData.data.length === 0) {
      return null;
    }

    const voltageData = historyData.data.map((d) => d.v);
    const socData = historyData.data.map((d) => d.soc);

    // Only show labels every 5th iteration
    const labels = historyData.data.map((d, idx) => {
      if (idx % 5 !== 0) return "";
      const time = d.time; // HH:MM format
      return time;
    });

    return {
      labels,
      datasets: [
        {
          data: voltageData.length > 0 ? voltageData : [0],
          color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`, // Red for voltage
          strokeWidth: 2,
          name: "Voltage (V)",
        },
        {
          data: socData.length > 0 ? socData : [0],
          color: (opacity = 1) => `rgba(0, 255, 0, ${opacity})`, // Green for SOC
          strokeWidth: 2,
          name: "Battery (%)",
        },
      ],
    };
  };

  const chartData = prepareChartData();

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 20,
          paddingHorizontal: 20,
          paddingBottom: 10,
          flexDirection: "row", // Align children horizontally
          alignItems: "center", // Center items vertically relative to each other
          justifyContent: "space-between", // Pushes "Back" to left and "History" to right
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingVertical: 5 }} // Added padding for a larger tap target
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
          Battery History
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Date Navigation */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingBottom: 15,
        }}
      >
        <TouchableOpacity
          onPress={handlePreviousDay}
          style={{ padding: 10, backgroundColor: "#333", borderRadius: 5 }}
        >
          <Text style={{ color: "#fff", fontSize: 16 }}>← Prev</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
          {formatDate(selectedDate)}
        </Text>
        <TouchableOpacity
          onPress={handleNextDay}
          style={{ padding: 10, backgroundColor: "#333", borderRadius: 5 }}
        >
          <Text style={{ color: "#fff", fontSize: 16 }}>Next →</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }}>
        {loading ? (
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              height: 300,
            }}
          >
            <ActivityIndicator size="large" color="#666" />
          </View>
        ) : chartData ? (
          <View style={{ paddingBottom: 20 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <LineChart
                data={chartData}
                width={screenWidth * 1.5}
                height={250}
                chartConfig={{
                  backgroundColor: "#000",
                  backgroundGradientFrom: "#000",
                  backgroundGradientTo: "#000",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  style: { borderRadius: 8 },
                  propsForDots: {
                    r: "1.5",
                    strokeWidth: "0.5",
                    stroke: "#fff",
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: "0",
                  },
                }}
                bezier
                style={{ marginVertical: 10 }}
              />
            </ScrollView>
            <Text
              style={{
                color: "#888",
                fontSize: 12,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              Data points: {historyData.count}
            </Text>
          </View>
        ) : (
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              height: 300,
            }}
          >
            <Text style={{ color: "#666", fontSize: 14 }}>
              No data available for this date
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
