import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Dimensions,
  ScrollView,
  SafeAreaView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LineChart } from "react-native-chart-kit";
import { Provider as PaperProvider, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";

type Entry = { id: string; value: number; date: string };

const METRICS = [
  { key: "weight", label: "Weight (kg)" },
  { key: "bicep", label: "Biceps (cm)" },
  { key: "chest", label: "Chest (cm)" },
  { key: "waist", label: "Waist (cm)" },
  { key: "thigh", label: "Thigh (cm)" },
];

const STORAGE_KEY = "measurements_data_v1";

export default function MeasurementsScreen() {
  const [data, setData] = useState<Record<string, Entry[]>>({});
  const [metric, setMetric] = useState("weight");
  const [modalVisible, setModalVisible] = useState(false);
  const [input, setInput] = useState("");
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<Entry | null>(null);
  const [editValue, setEditValue] = useState("");
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; value: number } | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
      else {
        const empty = Object.fromEntries(METRICS.map((m) => [m.key, []]));
        setData(empty);
      }
    })();
  }, []);

  const save = async (next: typeof data) =>
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  const add = () => {
    const v = parseFloat(input.replace(",", "."));
    if (!v) return;
    const entry = { id: Date.now().toString(), value: v, date: new Date().toISOString() };
    const next = { ...data, [metric]: [...data[metric], entry] };
    setData(next);
    save(next);
    setInput("");
    setModalVisible(false);
  };

  const sorted = [...(data[metric] || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const deleteMeasurement = (id: string) => {
    Alert.alert(
      "Delete measurement?",
      "Are you sure you want to delete this measurement?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updated = {
              ...data,
              [metric]: data[metric].filter((m) => m.id !== id),
            };

            setData(updated);
            save(updated);
          },
        },
      ]
    );
  };

  return (

    <PaperProvider>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: "#fff" }}
      >
        <View style={styles.container}>
          <View style={styles.metricRow}>
            {METRICS.map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMetric(m.key)}
                style={[styles.metricButton, metric === m.key && styles.metricButtonActive]}
              >
                <Text style={[styles.metricText, metric === m.key && styles.metricTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>


          {sorted.length > 0 ? (
            <View>
              <LineChart
                data={{
                  labels: sorted.map((e, i) =>
                    i % 5 === 0
                      ? new Date(e.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })
                      : ""
                  ),
                  datasets: [
                    {
                      data: sorted.map((e) => e.value),
                      color: () => "#3B82F6",
                      strokeWidth: 2,
                    },
                  ],
                }}
                width={Dimensions.get("window").width - 40}
                height={260}
                withDots={false}
                withInnerLines={false}
                fromZero
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 1,
                  color: () => "#3B82F6",
                  labelColor: () => "#555",
                }}
                style={styles.chart}
                onDataPointClick={({ value, index }) => {
                  setSelectedValue(value);
                  setSelectedIndex(index);
                }}
              />

              {selectedIndex !== null && (
                <Text style={styles.tooltip}>
                  {sorted[selectedIndex].date.slice(0, 10)} → {selectedValue}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noData}>No measurements yet</Text>
          )}


          <Button mode="contained" onPress={() => setModalVisible(true)} style={styles.addButton} labelStyle={{ color: "#fff", fontWeight: "400" }}>
            ADD MEASUREMENT
          </Button>

          {/* ✅ HISTORIA POMIARÓW */}
          {sorted.length > 0 && (

            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: "600", fontSize: 16, marginBottom: 6 }}>
                History
              </Text>

              <View
                style={{
                  minHeight: 55,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 8,
                  padding: 6,
                  marginBottom: 0,
                }}
              >
                {sorted.slice().reverse().map((item) => (
                  <View
                    key={item.id}
                    style={{
                      paddingVertical: 6,
                      borderBottomWidth: 1,
                      borderColor: "#ddd",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setEditItem(item);
                        setEditValue(item.value.toString());
                      }}
                      style={{ flex: 1 }}
                    >
                      <Text>{new Date(item.date).toLocaleString()}</Text>
                      <Text style={{ fontWeight: "600" }}>{item.value}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => deleteMeasurement(item.id)}>
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

            </View>
          )}

          <Modal visible={editItem !== null} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <TextInput
                  placeholder="New value"
                  value={editValue}
                  keyboardType="numeric"
                  onChangeText={setEditValue}
                  style={styles.input}
                />
                <View style={styles.modalButtons}>
                  <Button onPress={() => setEditItem(null)}>Cancel</Button>
                  <Button
                    mode="contained"
                    onPress={() => {
                      const v = parseFloat(editValue.replace(",", "."));
                      if (!v || !editItem) return;

                      const next = {
                        ...data,
                        [metric]: data[metric].map((e) =>
                          e.id === editItem.id ? { ...e, value: v } : e
                        ),
                      };
                      setData(next);
                      save(next);
                      setEditItem(null);
                      setEditValue("");
                    }}
                  >
                    Save
                  </Button>
                </View>
              </View>
            </View>
          </Modal>



          <Modal visible={modalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <TextInput
                  placeholder="Enter value"
                  placeholderTextColor="#888"
                  value={input}
                  keyboardType="numeric"
                  onChangeText={setInput}
                  style={styles.input}
                />
                <View style={styles.modalButtons}>
                  <Button onPress={() => setModalVisible(false)} textColor="#2563EB">Cancel</Button>
                  <Button mode="contained" onPress={add} buttonColor="#2563EB" textColor="#fff" >Save</Button>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", padding: 16, paddingTop: 20 },
  title: { textAlign: "center", fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { textAlign: "center", color: "#777", marginBottom: 16 },

  metricRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 16 },
  metricButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    margin: 4,
  },
  metricButtonActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  metricText: { color: "#333" },
  metricTextActive: { color: "#fff", fontWeight: "700" },

  chart: { borderRadius: 12, marginVertical: 20 },
  addButton: { marginTop: -25, marginBottom: 30, backgroundColor: "#3B82F6", color: "#fff" },
  noData: { textAlign: "center", color: "#888", marginTop: 30 },

  modalOverlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "#fff", padding: 20, borderRadius: 12, margin: 20 },
  input: { borderWidth: 1, borderColor: "#ccccccff", color: "#000", borderRadius: 8, padding: 12, marginBottom: 16 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  tooltip: {
    textAlign: "center",
    marginTop: 6,
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  screen: {
    flex: 1,
    backgroundColor: "#fff", // <- TUTAJ tło całego ekranu
  },

  scrollContent: {
    padding: 16,
    paddingTop: 70,
  },
});
