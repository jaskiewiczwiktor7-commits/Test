import { Ionicons } from "@expo/vector-icons";
import {
    CameraView,
    useCameraPermissions,
    type BarcodeScanningResult,
} from "expo-camera";
import DateTimePicker from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MacroKey = "calories" | "protein" | "carbs" | "fat";
type SectionKey = "breakfast" | "secondBreakfast" | "lunch" | "snack" | "dinner";

type FoodItem = {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: string; // YYYY-MM-DD key for history
};

type FoodForm = {
    name: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    weight: string;
};

const SECTION_CONFIG: { key: SectionKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "breakfast", label: "Breakfast", icon: "sunny-outline" },
    { key: "secondBreakfast", label: "Second Breakfast", icon: "cloud-outline" },
    { key: "lunch", label: "Lunch", icon: "restaurant-outline" },
    { key: "snack", label: "Snack", icon: "ice-cream-outline" },
    { key: "dinner", label: "Dinner", icon: "moon-outline" },
];

const GOALS: Record<MacroKey, number> = {
    calories: 2400,
    protein: 170,
    carbs: 260,
    fat: 75,
};

const COLORS: Record<MacroKey, string> = {
    calories: "#2563EB",
    protein: "#10B981",
    carbs: "#F59E0B",
    fat: "#EF4444",
};

const MACRO_ICONS: Record<MacroKey, keyof typeof Ionicons.glyphMap> = {
    calories: "flame-outline",
    protein: "barbell-outline",
    carbs: "pizza-outline",
    fat: "water-outline",
};

const initialFoods: Record<SectionKey, FoodItem[]> = {
    breakfast: [],
    secondBreakfast: [],
    lunch: [],
    snack: [],
    dinner: [],
};

const emptyForm = (): FoodForm => ({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    weight: "",
});

const dateKey = (d: Date) => d.toISOString().slice(0, 10);
const formatHuman = (d: Date) => d.toLocaleDateString();

export default function MealsScreen() {
    const [foods, setFoods] = useState<Record<SectionKey, FoodItem[]>>(initialFoods);
    const [activeSection, setActiveSection] = useState<SectionKey>("breakfast");
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<{ section: SectionKey; item: FoodItem } | null>(null);
    const [form, setForm] = useState<FoodForm>(emptyForm());
    const [scannerVisible, setScannerVisible] = useState(false);
    const [isProcessingScan, setIsProcessingScan] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const scanningRef = useRef(false);
    const [scannedMode, setScannedMode] = useState(false);
    const [per100, setPer100] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Calendar / history state
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const selectedDateKey = useMemo(() => dateKey(selectedDate), [selectedDate]);

    // LIVE VALUES - only used when scannedMode
    const liveValues = useMemo(() => {
        if (!scannedMode) return null;
        const weight = Number(form.weight) || 100;
        const multiplier = weight / 100;
        return {
            calories: Math.round(per100.calories * multiplier),
            protein: Math.round(per100.protein * multiplier),
            carbs: Math.round(per100.carbs * multiplier),
            fat: Math.round(per100.fat * multiplier),
        };
    }, [scannedMode, form.weight, per100]);

    const flattenedFoods = useMemo(() => Object.values(foods).flat(), [foods]);

    // Filtered to selected day for history view
    const filteredFoods = useMemo(
        () => flattenedFoods.filter((f) => f.date === selectedDateKey),
        [flattenedFoods, selectedDateKey]
    );

    const totals = useMemo(
        () =>
            filteredFoods.reduce(
                (acc, item) => ({
                    calories: acc.calories + item.calories,
                    protein: acc.protein + item.protein,
                    carbs: acc.carbs + item.carbs,
                    fat: acc.fat + item.fat,
                }),
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
            ),
        [filteredFoods]
    );

    const macroStats = (Object.keys(GOALS) as MacroKey[]).map((key) => ({
        key,
        label: key === "calories" ? "Calories" : key.charAt(0).toUpperCase() + key.slice(1),
        value: totals[key],
        goal: GOALS[key],
        suffix: key === "calories" ? "kcal" : "g",
    }));

    const summaryCards = macroStats.map((stat) => {
        const remaining = Math.max(stat.goal - stat.value, 0);
        return {
            ...stat,
            color: COLORS[stat.key],
            icon: MACRO_ICONS[stat.key],
            remaining,
            ratio: stat.goal === 0 ? 0 : Math.min(stat.value / stat.goal, 1),
        };
    });

    const sectionTotals = useMemo(
        () =>
            SECTION_CONFIG.reduce<Record<SectionKey, { calories: number; protein: number; carbs: number; fat: number }>>(
                (acc, section) => {
                    acc[section.key] = foods[section.key]
                        .filter((it) => it.date === selectedDateKey)
                        .reduce(
                            (sub, item) => ({
                                calories: sub.calories + item.calories,
                                protein: sub.protein + item.protein,
                                carbs: sub.carbs + item.carbs,
                                fat: sub.fat + item.fat,
                            }),
                            { calories: 0, protein: 0, carbs: 0, fat: 0 }
                        );
                    return acc;
                },
                {} as Record<SectionKey, { calories: number; protein: number; carbs: number; fat: number }>
            ),
        [foods, selectedDateKey]
    );

    const openModal = useCallback(
        (sectionKey: SectionKey, item?: FoodItem) => {
            setActiveSection(sectionKey);
            setScannedMode(false);
            if (item) {
                setEditingItem({ section: sectionKey, item });
                setForm({
                    name: item.name,
                    calories: String(item.calories),
                    protein: String(item.protein),
                    carbs: String(item.carbs),
                    fat: String(item.fat),
                    weight: "100",
                });
            } else {
                setEditingItem(null);
                setForm(emptyForm());
            }
            setModalVisible(true);
        },
        []
    );

    const closeModal = useCallback(() => {
        setModalVisible(false);
        setEditingItem(null);
        setForm(emptyForm());
        setScannedMode(false);
    }, []);

    const handleSaveFood = useCallback(() => {
        if (!form.name.trim()) {
            Alert.alert("Missing name", "Please provide a product name.");
            return;
        }

        const weight = Number(form.weight) || 100;
        const multiplier = weight / 100;

        const payload: FoodItem = {
            id: editingItem ? editingItem.item.id : `${Date.now()}`,
            name: form.name.trim(),
            calories: scannedMode ? liveValues?.calories ?? 0 : Math.round((Number(form.calories) || 0) * multiplier),
            protein: scannedMode ? liveValues?.protein ?? 0 : Math.round((Number(form.protein) || 0) * multiplier),
            carbs: scannedMode ? liveValues?.carbs ?? 0 : Math.round((Number(form.carbs) || 0) * multiplier),
            fat: scannedMode ? liveValues?.fat ?? 0 : Math.round((Number(form.fat) || 0) * multiplier),
            date: editingItem ? editingItem.item.date ?? selectedDateKey : selectedDateKey,
        };

        setFoods((prev) => {
            const next = { ...prev };
            if (editingItem) {
                next[editingItem.section] = next[editingItem.section].map((item) =>
                    item.id === editingItem.item.id ? payload : item
                );
            } else {
                next[activeSection] = [...next[activeSection], payload];
            }
            return next;
        });

        closeModal();
    }, [activeSection, closeModal, editingItem, form, scannedMode, liveValues, selectedDateKey]);

    const handleDeleteFood = useCallback(() => {
        if (!editingItem) return;
        Alert.alert("Delete entry", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                    setFoods((prev) => ({
                        ...prev,
                        [editingItem.section]: prev[editingItem.section].filter(
                            (item) => item.id !== editingItem.item.id
                        ),
                    }));
                    closeModal();
                },
            },
        ]);
    }, [closeModal, editingItem]);

    const ensureCameraPermission = useCallback(async () => {
        if (Platform.OS === "web") {
            Alert.alert("Not supported", "Barcode scanning works only on a device.");
            return false;
        }

        let response = permission;
        if (!response || !response.granted) {
            response = await requestPermission();
        }

        if (!response?.granted) {
            Alert.alert("Camera permission", "Camera permission is required to scan barcodes.");
            return false;
        }

        return true;
    }, [permission, requestPermission]);

    const sectionLabel = useCallback(
        (sectionKey: SectionKey) =>
            SECTION_CONFIG.find((section) => section.key === sectionKey)?.label ?? "meal",
        []
    );

    const applyScannedProduct = useCallback(
        (product: { name: string; calories: number; protein: number; carbs: number; fat: number }) => {
            // ustawiamy scannedMode i wartości per100, oraz od razu wypełniamy pola
            setScannedMode(true);
            const c = Math.round(product.calories || 0);
            const p = Math.round(product.protein || 0);
            const ca = Math.round(product.carbs || 0);
            const f = Math.round(product.fat || 0);

            setPer100({
                calories: c,
                protein: p,
                carbs: ca,
                fat: f,
            });

            // uzupełniamy form dla 100g tak, żeby od razu było widać wartości
            setForm({
                name: product.name || "Scanned product",
                calories: String(c),
                protein: String(p),
                carbs: String(ca),
                fat: String(f),
                weight: "100",
            });

            setScannerVisible(false);
            setModalVisible(true);
            setEditingItem(null);
        },
        []
    );

    const fetchProductFromBarcode = useCallback(async (barcode: string) => {
        try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            const json = await res.json();

            if (!json?.product) {
                Alert.alert("Not found", "Product not present in Open Food Facts.");
                return;
            }

            const nutriments = json.product.nutriments ?? {};
            applyScannedProduct({
                name: json.product.product_name || "Unknown product",
                calories: nutriments["energy-kcal_100g"] ? Number(nutriments["energy-kcal_100g"]) : 0,
                protein: nutriments.proteins_100g ? Number(nutriments.proteins_100g) : 0,
                carbs: nutriments.carbohydrates_100g ? Number(nutriments.carbohydrates_100g) : 0,
                fat: nutriments.fat_100g ? Number(nutriments.fat_100g) : 0,
            });
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch product info.");
        } finally {
            setIsProcessingScan(false);
            scanningRef.current = false;
        }
    }, [applyScannedProduct]);

    const handleBarcodeScanned = useCallback(
        (event: BarcodeScanningResult) => {
            if (scanningRef.current) return;
            scanningRef.current = true;
            setIsProcessingScan(true);
            fetchProductFromBarcode(event.data);
        },
        [fetchProductFromBarcode]
    );

    const openScanner = useCallback(async () => {
        const allowed = await ensureCameraPermission();
        if (!allowed) return;
        setIsProcessingScan(false);
        scanningRef.current = false;
        setScannerVisible(true);
    }, [ensureCameraPermission]);


    const prevDay = () => setSelectedDate((d) => new Date(d.getTime() - 24 * 3600 * 1000));
    const nextDay = () => setSelectedDate((d) => new Date(d.getTime() + 24 * 3600 * 1000));
    const setToday = () => setSelectedDate(new Date());

    const renderSummaryCard = (card: (typeof summaryCards)[number]) => (
        <View key={card.key} style={[styles.summaryCard, { backgroundColor: card.color }]}>
            <View style={styles.summaryIconCorner}>
                <Ionicons name={card.icon} size={20} color="rgba(255,255,255,0.9)" />
            </View>

            <View style={{ flex: 1, paddingTop: 4 }}>
                <Text style={styles.summaryLabel}>{card.label}</Text>
                <Text style={styles.summaryValue}>
                    {card.value} / {card.goal} {card.suffix}
                </Text>
                <Text style={styles.summarySub}>
                    {card.remaining > 0 ? `${card.remaining} ${card.suffix} remaining` : "Goal reached"}
                </Text>
                <View style={styles.summaryProgressTrack}>
                    <View
                        style={[
                            styles.summaryProgressFill,
                            { width: `${card.ratio * 100}%`, backgroundColor: "rgba(255,255,255,0.9)" },
                        ]}
                    />
                </View>
            </View>
        </View>
    );

    const renderFoodItem = (sectionKey: SectionKey) => (item: FoodItem) => (
        <TouchableOpacity
            key={item.id}
            style={styles.itemCard}
            onPress={() => openModal(sectionKey, item)}
        >
            <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetails}>
                    {item.calories} kcal · P {item.protein}g · C {item.carbs}g · F {item.fat}g
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
    );

    const updateFormProportionally = (field: keyof FoodForm, value: string) => {
        if (field === "weight") {
            if (scannedMode) {
                // przy scannedMode zmieniamy tylko weight — liveValues przeliczy się automatycznie
                setForm((prev) => ({ ...prev, weight: value }));
            } else {
                const oldWeight = Number(form.weight) || 100;
                const newWeight = Number(value) || 0;
                const ratio = oldWeight === 0 ? 0 : newWeight / oldWeight;

                setForm((prev) => ({
                    ...prev,
                    weight: value,
                    calories: String(Math.round((Number(prev.calories) || 0) * ratio)),
                    protein: String(Math.round((Number(prev.protein) || 0) * ratio)),
                    carbs: String(Math.round((Number(prev.carbs) || 0) * ratio)),
                    fat: String(Math.round((Number(prev.fat) || 0) * ratio)),
                }));
            }
        } else {
            setForm((prev) => ({
                ...prev,
                [field]: value,
            }));
        }
    };


    // Calendar handlers (DateTimePicker)
    const openDatePicker = () => setShowDatePicker(true);
    const onDateChange = (_: any, d?: Date) => {
        if (d) setSelectedDate(d);
        if (Platform.OS !== "ios") setShowDatePicker(false);
    };

    return (
        <>
            <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
                <StatusBar style="dark" />
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={{ paddingBottom: 80 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Calendar header - only one, human-friendly date shown */}
                    <View style={{ paddingHorizontal: 20, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <TouchableOpacity onPress={prevDay} style={{ padding: 8 }}>
                                <Ionicons name="chevron-back" size={22} color="#111" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={openDatePicker} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
                                <Text style={{ fontSize: 16, fontWeight: "700" }}>{formatHuman(selectedDate)}</Text>
                                <Ionicons name="calendar-outline" size={22} color="#2563EB" style={{ marginLeft: 10 }} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={nextDay} style={{ padding: 8 }}>
                                <Ionicons name="chevron-forward" size={22} color="#111" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <TouchableOpacity onPress={setToday} style={{ padding: 8 }}>
                                <Text style={{ color: "#2563EB", fontWeight: "700" }}>Today</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display={Platform.OS === "ios" ? "spinner" : "default"}
                            onChange={onDateChange}
                            maximumDate={new Date(2100, 0, 1)}
                        />
                    )}

                    <View style={styles.summarySection}>
                        <View style={styles.summaryRow}>{summaryCards.slice(0, 2).map(renderSummaryCard)}</View>
                        <View style={styles.summaryRow}>{summaryCards.slice(2).map(renderSummaryCard)}</View>
                    </View>

                    <View style={{ marginTop: 24 }}>
                        {SECTION_CONFIG.map((section) => {
                            const items = foods[section.key].filter((it) => it.date === selectedDateKey);
                            const totalsForSection = sectionTotals[section.key];

                            return (
                                <View key={section.key} style={styles.sectionBlock}>
                                    <View style={styles.sectionHeader}>
                                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                                            <Ionicons name={section.icon} size={20} color="#2563EB" />
                                            <View style={{ marginLeft: 8 }}>
                                                <Text style={styles.sectionTitle}>{section.label}</Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: "flex-end" }}>
                                            <Text style={styles.sectionCalories}>{totalsForSection.calories} kcal</Text>
                                            <Text style={styles.sectionMacros}>
                                                P {totalsForSection.protein}g · C {totalsForSection.carbs}g · F{" "}
                                                {totalsForSection.fat}g
                                            </Text>
                                        </View>
                                    </View>

                                    {items.length === 0 ? (
                                        <Text style={styles.emptyText}>No foods added for this date.</Text>
                                    ) : (
                                        items.map((item) => renderFoodItem(section.key)(item))
                                    )}

                                    <TouchableOpacity
                                        style={styles.addFoodButton}
                                        onPress={() => openModal(section.key)}
                                    >
                                        <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
                                        <Text style={styles.addFoodText}>Add food</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </SafeAreaView>

            <Modal visible={modalVisible && !scannerVisible} animationType="slide" transparent>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            style={styles.modalContainer}
                        >
                            <View style={styles.modalBox}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>
                                        {editingItem
                                            ? "Edit entry"
                                            : `Add to ${SECTION_CONFIG.find((s) => s.key === activeSection)?.label} (${selectedDateKey})`}
                                    </Text>
                                    {editingItem && (
                                        <TouchableOpacity onPress={handleDeleteFood}>
                                            <Ionicons name="trash-outline" size={24} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Food Name */}
                                <Text style={styles.inputLabel}>Food Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter food name"
                                    placeholderTextColor="#6B7280"
                                    value={form.name}
                                    onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
                                />

                                {/* Calories */}
                                <Text style={styles.inputLabel}>Calories (kcal)</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[styles.input, scannedMode && styles.readonlyInput]}
                                        placeholder="0"
                                        placeholderTextColor="#6B7280"
                                        keyboardType="numeric"
                                        value={scannedMode ? String(liveValues?.calories ?? 0) : form.calories}
                                        onChangeText={scannedMode ? undefined : (text) => updateFormProportionally("calories", text)}
                                        editable={!scannedMode}
                                    />
                                    {scannedMode && <Ionicons name="lock-closed" size={18} color="#9CA3AF" style={styles.lockIcon} />}
                                </View>

                                {/* Macros Row */}
                                <View style={{ flexDirection: "row" }}>
                                    <View style={{ flex: 1, marginRight: 6 }}>
                                        <Text style={styles.inputLabel}>Protein (g)</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={[styles.input, scannedMode && styles.readonlyInput]}
                                                placeholder="0"
                                                placeholderTextColor="#6B7280"
                                                keyboardType="numeric"
                                                value={scannedMode ? String(liveValues?.protein ?? 0) : form.protein}
                                                onChangeText={scannedMode ? undefined : (text) => updateFormProportionally("protein", text)}
                                                editable={!scannedMode}
                                            />
                                            {scannedMode && <Ionicons name="lock-closed" size={16} color="#9CA3AF" style={styles.lockIcon} />}
                                        </View>
                                    </View>

                                    <View style={{ flex: 1, marginHorizontal: 3 }}>
                                        <Text style={styles.inputLabel}>Carbs (g)</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={[styles.input, scannedMode && styles.readonlyInput]}
                                                placeholder="0"
                                                placeholderTextColor="#6B7280"
                                                keyboardType="numeric"
                                                value={scannedMode ? String(liveValues?.carbs ?? 0) : form.carbs}
                                                onChangeText={scannedMode ? undefined : (text) => updateFormProportionally("carbs", text)}
                                                editable={!scannedMode}
                                            />
                                            {scannedMode && <Ionicons name="lock-closed" size={16} color="#9CA3AF" style={styles.lockIcon} />}
                                        </View>
                                    </View>

                                    <View style={{ flex: 1, marginLeft: 6 }}>
                                        <Text style={styles.inputLabel}>Fat (g)</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={[styles.input, scannedMode && styles.readonlyInput]}
                                                placeholder="0"
                                                placeholderTextColor="#6B7280"
                                                keyboardType="numeric"
                                                value={scannedMode ? String(liveValues?.fat ?? 0) : form.fat}
                                                onChangeText={scannedMode ? undefined : (text) => updateFormProportionally("fat", text)}
                                                editable={!scannedMode}
                                            />
                                            {scannedMode && <Ionicons name="lock-closed" size={16} color="#9CA3AF" style={styles.lockIcon} />}
                                        </View>
                                    </View>
                                </View>

                                {/* Weight */}
                                <Text style={styles.inputLabel}>Weight (g)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#6B7280"
                                    keyboardType="numeric"
                                    value={form.weight}
                                    onChangeText={(text) => updateFormProportionally("weight", text)}
                                />
                                <TouchableOpacity
                                    style={styles.scanButton}
                                    onPress={openScanner}
                                >
                                    <Ionicons name="barcode-outline" size={18} color="#fff" />
                                    <Text style={styles.scanButtonText}>Scan barcode</Text>
                                </TouchableOpacity>

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: "#9CA3AF" }]}
                                        onPress={closeModal}
                                    >
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: "#2563EB" }]}
                                        onPress={handleSaveFood}
                                    >
                                        <Text style={styles.modalButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {scannerVisible && (
                <View style={styles.scannerFullscreen}>
                    <View style={{ flex: 1, backgroundColor: "#000" }}>
                        {!permission ? (
                            <View style={styles.permissionState}>
                                <Text style={{ color: "#fff" }}>Requesting camera permission...</Text>
                            </View>
                        ) : !permission.granted ? (
                            <View style={styles.permissionState}>
                                <Text style={{ color: "#fff", marginBottom: 12 }}>Camera access denied.</Text>
                                <TouchableOpacity onPress={requestPermission}>
                                    <Text style={{ color: "#93C5FD" }}>Grant permission</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <CameraView
                                    style={styles.camera}
                                    facing="back"
                                    ratio="4:3"
                                    barcodeScannerSettings={{
                                        barcodeTypes: [
                                            "ean13",
                                            "ean8",
                                            "upc_a",
                                            "upc_e",
                                            "code39",
                                            "code93",
                                            "code128",
                                            "qr",
                                        ],
                                    }}
                                    onBarcodeScanned={handleBarcodeScanned}
                                />

                                <View style={styles.overlay}>
                                    <View style={styles.overlayRow} />
                                    <View style={styles.overlayRow}>
                                        <View style={styles.overlaySide} />
                                        <View style={styles.overlayFrame} />
                                        <View style={styles.overlaySide} />
                                    </View>
                                    <View style={styles.overlayRow} />
                                </View>

                                {isProcessingScan && (
                                    <View style={styles.scannerLoadingOverlay}>
                                        <ActivityIndicator size="large" color="#fff" />
                                        <Text style={styles.scannerLoadingText}>Fetching product…</Text>
                                    </View>
                                )}
                            </>
                        )}

                        <TouchableOpacity
                            onPress={() => {
                                setScannerVisible(false);
                                setIsProcessingScan(false);
                                scanningRef.current = false;
                            }}
                            style={styles.closeScannerButton}
                        >
                            <Text style={{ color: "#fff", fontSize: 16 }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", paddingTop: 10 },
    safeArea: { flex: 1, backgroundColor: "#fff" },
    summarySection: { paddingHorizontal: 20, marginTop: 4 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    summaryCard: {
        flex: 1,
        borderRadius: 14,
        padding: 12,
        marginHorizontal: 4,
        marginVertical: 6,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
        elevation: 4,
    },
    summaryIconCorner: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    summaryLabel: { color: "rgba(255,255,255,0.9)", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
    summaryValue: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 4 },
    summarySub: { color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: "500" },
    summaryProgressTrack: {
        height: 6,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.25)",
        marginTop: 8,
        overflow: "hidden",
    },
    summaryProgressFill: {
        height: "100%",
        borderRadius: 999,
    },
    sectionBlock: {
        marginBottom: 26,
        paddingHorizontal: 20,
        paddingVertical: 18,
        backgroundColor: "#F3F4F6",
        borderRadius: 18,
        marginHorizontal: 12,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
    sectionCalories: { fontSize: 16, fontWeight: "700", color: "#111827" },
    sectionMacros: { color: "#6B7280", fontSize: 13 },
    itemCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 1,
    },
    itemName: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
    itemDetails: { color: "#4B5563", fontSize: 14, marginTop: 2 },
    emptyText: { color: "#94A3B8", fontStyle: "italic" },
    addFoodButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#BFDBFE",
        marginTop: 4,
    },
    addFoodText: { color: "#2563EB", fontWeight: "700", marginLeft: 8 },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    modalContainer: { width: "100%" },
    modalBox: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        width: "100%",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 6,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    modalTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
    input: {
        borderWidth: 1,
        borderColor: "#ccccccff",
        color: "#000",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 4,
    },
    inputWrapper: {
        position: "relative",
    },
    readonlyInput: {
        backgroundColor: "#F3F4F6",
        color: "#6B7280",
        borderColor: "#E5E7EB",
    },
    lockIcon: {
        position: "absolute",
        right: 12,
        top: 14,
        opacity: 0.9,
    },
    scanButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#059669",
        padding: 12,
        borderRadius: 10,
        marginVertical: 12,
    },
    scanButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginHorizontal: 6,
    },
    modalButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    permissionState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    closeScannerButton: {
        position: "absolute",
        bottom: 40,
        alignSelf: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 999,
    },
    scannerFullscreen: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99,
    },
    scannerLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
    },
    scannerLoadingText: {
        color: "#fff",
        fontWeight: "600",
        marginTop: 8,
    },
    camera: {
        flex: 1,
        width: "100%",
        aspectRatio: 3 / 4,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    overlayRow: { flexDirection: "row" },
    overlaySide: { flex: 1 },
    overlayFrame: {
        width: 300,
        height: 160,
        borderWidth: 2,
        borderColor: "#fff",
        borderRadius: 14,
    },
});
