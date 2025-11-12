import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  StyleSheet,
  Platform,
} from "react-native";

export default function BMI() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bmi, setBmi] = useState<string | null>(null);

  const getBMIStatus = (bmiValue: number) => {
    if (bmiValue < 18.5) {
      return { label: "Underweight", color: "#f59e0b" };
    } else if (bmiValue < 25) {
      return { label: "Normal", color: "#4ade80" }; 
    } else if (bmiValue < 30) {
      return { label: "Overweight", color: "#f59e0b" }; 
    } else {
      return { label: "Obesity", color: "#ef4444" }; 
    }
  };

  const calculateBMI = () => {
    Keyboard.dismiss();

    if (!weight || !height) {
      setBmi("Enter correct values");
      return;
    }

    const weightNum = parseFloat(weight.replace(",", "."));
    const heightNum = parseFloat(height.replace(",", ".")) / 100;

    if (Number.isNaN(weightNum) || Number.isNaN(heightNum) || weightNum <= 0 || heightNum <= 0) {
      setBmi("Values must be > 0");
      return;
    }

    const result = weightNum / (heightNum * heightNum);
    const bmiValue = result.toFixed(1);
    setBmi(bmiValue);
  };

  return (
    <View style={styles.screen}>

      <View style={styles.form}>
        <Text style={styles.label}>Weight</Text>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          placeholder="kg"
          placeholderTextColor="#9AA3B2"
          keyboardType="numeric"
          returnKeyType="done"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Height</Text>
        <TextInput
          value={height}
          onChangeText={setHeight}
          placeholder="cm"
          placeholderTextColor="#9AA3B2"
          keyboardType="numeric"
          returnKeyType="done"
          style={styles.input}
        />

        <TouchableOpacity onPress={calculateBMI} style={styles.button} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Oblicz</Text>
        </TouchableOpacity>

        {bmi !== null && !isNaN(Number(bmi)) && (
          <View style={styles.resultBox}>
            {(() => {
              const status = getBMIStatus(Number(bmi));
              return (
                <>
                  <Text style={[styles.resultValue, { color: status.color }]}>{bmi}</Text>
                  <Text style={{ color: status.color, fontSize: 16, marginTop: 6 }}>
                    {status.label}
                  </Text>
                </>
              );
            })()}
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
  flex: 1,
  backgroundColor: "#fff",
  paddingHorizontal: 20,
  paddingTop: 70, // ✅ TERAZ JEST TAK SAMO JAK W Measurements
  },
  heading: {
    color: "#000000ff",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,

  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginTop: 120,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        marginBottom: 80,
      },
      android: {
        elevation: 4,
      },
    }),

  },
  label: {
    color: "#AEB8C4",
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: "#4b4b4bff",
    fontSize: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000000a8",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),

  },
  button: {
    marginTop: 18,
    backgroundColor: "#2563EB", // niebieski akcent
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resultBox: {
    marginTop: 18,
    backgroundColor: "#ffffffc4",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  resultLabel: {
    color: "#9FB3D8",
    fontSize: 13,
    marginBottom: 6,
  },
  resultValue: {
    color: "#9AE6B4",
    fontSize: 28,
    fontWeight: "700",
  },
});
