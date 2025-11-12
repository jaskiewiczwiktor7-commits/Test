import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    TextInput,
    Modal,
    Alert, // 🔹 dodane
} from "react-native";
import * as Progress from "react-native-progress";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
    calories: "#3B82F6",
    protein: "#10B981",
    carbs: "#F59E0B",
    fat: "#EF4444",
};

const SCREEN_WIDTH = Dimensions.get("window").width;

type MacroKey = "calories" | "protein" | "carbs" | "fat";

export default function MealsScreen() {
    const [meals, setMeals] = useState([
        {
            id: "1",
            section: "Breakfast",
            name: "Oatmeal with Banana",
            calories: 350,
            protein: 18,
            carbs: 50,
            fat: 8,
        },
        {
            id: "2",
            section: "Lunch",
            name: "Chicken & Rice",
            calories: 600,
            protein: 45,
            carbs: 70,
            fat: 15,
        },
    ]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMeal, setEditingMeal] = useState<any>(null);
    const [form, setForm] = useState({
        name: "",
        section: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
    });

    const goals = { calories: 2500, protein: 180, carbs: 250, fat: 70 };

    const totals = meals.reduce(
        (acc, meal) => {
            acc.calories += meal.calories;
            acc.protein += meal.protein;
            acc.carbs += meal.carbs;
            acc.fat += meal.fat;
            return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const progress: Record<MacroKey, number> = {
        calories: Math.min(1, totals.calories / goals.calories),
        protein: Math.min(1, totals.protein / goals.protein),
        carbs: Math.min(1, totals.carbs / goals.carbs),
        fat: Math.min(1, totals.fat / goals.fat),
    };

    const stats: { key: MacroKey; label: string; value: number; goal: number }[] = [
        { key: "calories", label: "Calories", value: totals.calories, goal: goals.calories },
        { key: "protein", label: "Protein", value: totals.protein, goal: goals.protein },
        { key: "carbs", label: "Carbs", value: totals.carbs, goal: goals.carbs },
        { key: "fat", label: "Fat", value: totals.fat, goal: goals.fat },
    ];

    const mealSections = ["Breakfast", "Second Breakfast", "Lunch", "Dinner"];

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(index);
    };

    const openModal = (section: string, mealToEdit?: any) => {
        if (mealToEdit) {
            setEditingMeal(mealToEdit);
            setForm({
                name: mealToEdit.name,
                section: mealToEdit.section,
                calories: String(mealToEdit.calories),
                protein: String(mealToEdit.protein),
                carbs: String(mealToEdit.carbs),
                fat: String(mealToEdit.fat),
            });
        } else {
            setEditingMeal(null);
            setForm({
                name: "",
                section,
                calories: "",
                protein: "",
                carbs: "",
                fat: "",
            });
        }
        setModalVisible(true);
    };

    const handleSaveMeal = () => {
        const newMeal = {
            id: editingMeal ? editingMeal.id : Date.now().toString(),
            name: form.name || "Unnamed meal",
            section: form.section || "Breakfast",
            calories: Number(form.calories) || 0,
            protein: Number(form.protein) || 0,
            carbs: Number(form.carbs) || 0,
            fat: Number(form.fat) || 0,
        };

        if (editingMeal) {
            setMeals((prev) => prev.map((m) => (m.id === editingMeal.id ? newMeal : m)));
        } else {
            setMeals((prev) => [...prev, newMeal]);
        }

        setModalVisible(false);
        setEditingMeal(null);
        resetForm();
    };

    const resetForm = () => {
        setForm({
            name: "",
            section: "",
            calories: "",
            protein: "",
            carbs: "",
            fat: "",
        });
    };

    // 🔹 Funkcja usuwania z potwierdzeniem
    const confirmDeleteMeal = (id: string) => {
        Alert.alert(
            "Delete Meal",
            "Are you sure you want to delete this meal?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        setMeals((prev) => prev.filter((m) => m.id !== id));
                        setModalVisible(false);
                        setEditingMeal(null);
                        resetForm();
                    },
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
            >
                {/* 🔹 Wykresy */}
                <View style={{ alignItems: "center", height: 350 }}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        decelerationRate="fast"
                        snapToInterval={SCREEN_WIDTH}
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={{
                            alignItems: "center",
                        }}
                        style={styles.chartScroll}
                    >
                        {stats.map((m) => (
                            <View
                                key={m.key}
                                style={[
                                    styles.chartCard,
                                    {
                                        width: SCREEN_WIDTH - 40,
                                        marginHorizontal: 20,
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 3 },
                                        shadowOpacity: 0.15,
                                        shadowRadius: 6,
                                        elevation: 5,
                                    },
                                ]}
                            >
                                <Progress.Circle
                                    progress={progress[m.key]}
                                    size={180}
                                    color={COLORS[m.key]}
                                    unfilledColor="#E5E7EB"
                                    borderWidth={0}
                                    thickness={12}
                                    showsText
                                    formatText={() =>
                                        m.key === "calories"
                                            ? `${m.value} kcal`
                                            : `${m.value} g`
                                    }
                                    textStyle={{
                                        color: "#000",
                                        fontWeight: "700",
                                        fontSize: 20,
                                    }}
                                />
                                <Text style={styles.chartLabel}>{m.label}</Text>
                                <Text style={styles.chartSub}>
                                    Goal: {m.goal} {m.key === "calories" ? "kcal" : "g"}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>

                    {/* 🔘 Kropki pod wykresami */}
                    <View style={{ flexDirection: "row", marginTop: 8 }}>
                        {stats.map((_, i) => (
                            <Ionicons
                                key={i}
                                name="ellipse"
                                size={8}
                                color={i === activeIndex ? "#2563EB" : "#D1D5DB"}
                                style={{ marginHorizontal: 4 }}
                            />
                        ))}
                    </View>
                </View>

                {/* 🔹 Makrosy */}
                <View style={styles.macrosRow}>
                    {stats.map((m) => (
                        <View key={m.key} style={styles.macroBox}>
                            <View
                                style={[styles.colorDot, { backgroundColor: COLORS[m.key] }]}
                            />
                            <Text style={styles.macroText}>
                                {m.value}
                                <Text style={{ color: "#9CA3AF" }}>/{m.goal}</Text>
                            </Text>
                        </View>
                    ))}
                </View>

                {/* 🔹 Sekcje posiłków */}
                <View style={{ marginTop: 20 }}>
                    {mealSections.map((section) => {
                        const sectionMeals = meals.filter((m) => m.section === section);
                        return (
                            <View key={section} style={styles.sectionBlock}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>{section}</Text>
                                    <TouchableOpacity onPress={() => openModal(section)}>
                                        <Text style={styles.addButton}>+ Add</Text>
                                    </TouchableOpacity>
                                </View>

                                {sectionMeals.length > 0 ? (
                                    sectionMeals.map((item) => (
                                        // 🔹 kliknięcie w cały card otwiera formularz
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.mealCard}
                                            onPress={() => openModal(section, item)}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.mealName}>{item.name}</Text>
                                                <Text style={styles.mealDetails}>
                                                    {item.calories} kcal | P: {item.protein}g | C:{" "}
                                                    {item.carbs}g | F: {item.fat}g
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={styles.emptyText}>No meals added</Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* 🔹 Modal dodawania/edycji */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            style={styles.modalContainer}
                        >
                            <View style={styles.modalBox}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>
                                        {editingMeal ? "Edit Meal" : "Add Meal"}
                                    </Text>

                                    {/* 🔹 Ikonka kosza (tylko podczas edycji) */}
                                    {editingMeal && (
                                        <TouchableOpacity
                                            onPress={() => confirmDeleteMeal(editingMeal.id)}
                                        >
                                            <Ionicons
                                                name="trash-outline"
                                                size={24}
                                                color="#EF4444"
                                            />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Formularz */}
                                <TextInput
                                    style={styles.input}
                                    placeholder="Meal name"
                                    placeholderTextColor="#9CA3AF"
                                    value={form.name}
                                    onChangeText={(t) => setForm({ ...form, name: t })}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Calories (kcal)"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    value={form.calories}
                                    onChangeText={(t) => setForm({ ...form, calories: t })}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Protein (g)"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    value={form.protein}
                                    onChangeText={(t) => setForm({ ...form, protein: t })}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Carbs (g)"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    value={form.carbs}
                                    onChangeText={(t) => setForm({ ...form, carbs: t })}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Fat (g)"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    value={form.fat}
                                    onChangeText={(t) => setForm({ ...form, fat: t })}
                                />

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: "#9CA3AF" }]}
                                        onPress={() => {
                                            setModalVisible(false);
                                            setEditingMeal(null);
                                        }}
                                    >
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: "#2563EB" }]}
                                        onPress={handleSaveMeal}
                                    >
                                        <Text style={styles.modalButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", paddingTop: 10 },
    chartScroll: { marginTop: 10 },
    chartCard: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 20,
        padding: 16,
    },
    chartLabel: { marginTop: 12, fontWeight: "700", color: "#111", fontSize: 20 },
    chartSub: { color: "#555", fontSize: 16, marginTop: 2 },
    macrosRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        marginTop: 20,
        paddingHorizontal: 20,
    },
    macroBox: { flexDirection: "row", alignItems: "center", marginRight: 12 },
    colorDot: { width: 14, height: 14, borderRadius: 4, marginRight: 3 },
    macroText: { fontWeight: "500", color: "#111" },
    sectionBlock: { marginBottom: 24, paddingHorizontal: 20 },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111" },
    addButton: { fontSize: 16, fontWeight: "700", color: "#2563EB" },
    mealCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
    },
    mealName: { fontSize: 16, fontWeight: "500", color: "#111" },
    mealDetails: { color: "#444", fontSize: 14 },
    emptyText: { color: "#999", fontStyle: "italic", textAlign: "center" },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: { width: "100%", paddingHorizontal: 20 },
    modalBox: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        width: "100%",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111",
    },
    input: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        fontSize: 16,
        color: "#111",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        marginHorizontal: 5,
        alignItems: "center",
    },
    modalButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
});
