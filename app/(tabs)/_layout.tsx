import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: "#ffffffff",
          },
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: "700",
            color: "#000000ff",
          },
          tabBarActiveTintColor: "#2563EB",
          tabBarStyle: {
            backgroundColor: "#ffffffff",
            borderTopColor: "#1e293b",
            justifyContent: "center",
            alignItems: "center",
            height: 70,
            paddingTop: 6,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "BMI calculator",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="body" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="measurements"
          options={{
            title: "Measurements",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="meals"
          options={{
            title: "Meals",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}

