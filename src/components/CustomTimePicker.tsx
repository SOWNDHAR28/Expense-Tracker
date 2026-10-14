import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "expo-haptics";
import AnimatedButton from "./AnimatedButton";

interface CustomTimePickerProps {
  visible: boolean;
  onClose?: () => void;
  onSave?: (date: Date) => void;
  onConfirm?: (date: Date) => void;
  onCancel?: () => void;
  initialDate?: Date;
  currentDate?: Date;
}

export default function CustomTimePicker({
  visible,
  onClose,
  onSave,
  onConfirm,
  onCancel,
  initialDate,
  currentDate,
}: CustomTimePickerProps) {
  const { themeColors } = useTheme();

  const effectiveClose = onClose || onCancel || (() => {});
  const effectiveSave = onSave || onConfirm || (() => {});
  const baseDate = initialDate || currentDate || new Date();

  // Local state for the selected time parts
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [isPM, setIsPM] = useState(false);

  // Initialize state when modal opens
  useEffect(() => {
    if (visible) {
      const validDate = baseDate instanceof Date && !isNaN(baseDate.getTime()) ? baseDate : new Date();
      const h = validDate.getHours();
      const m = validDate.getMinutes();
      setHours(h % 12 || 12);
      setMinutes(m);
      setIsPM(h >= 12);
    }
  }, [visible, baseDate]);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleIncrementHour = () => {
    triggerHaptic();
    setHours((prev) => (prev === 12 ? 1 : prev + 1));
  };

  const handleDecrementHour = () => {
    triggerHaptic();
    setHours((prev) => (prev === 1 ? 12 : prev - 1));
  };

  const handleIncrementMinute = () => {
    triggerHaptic();
    setMinutes((prev) => (prev === 59 ? 0 : prev + 1));
  };

  const handleDecrementMinute = () => {
    triggerHaptic();
    setMinutes((prev) => (prev === 0 ? 59 : prev - 1));
  };

  const toggleAMPM = () => {
    triggerHaptic();
    setIsPM(!isPM);
  };

  const handleSave = () => {
    triggerHaptic();
    const newDate = new Date(baseDate);
    
    let finalHours = hours;
    if (isPM && finalHours !== 12) {
      finalHours += 12;
    } else if (!isPM && finalHours === 12) {
      finalHours = 0;
    }

    newDate.setHours(finalHours, minutes, 0, 0);
    effectiveSave(newDate);
  };

  // Format to 2 digits (e.g. 05 instead of 5)
  const formatTimeStr = (num: number) => num.toString().padStart(2, "0");

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={effectiveClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
              
              <Text style={[styles.title, { color: themeColors.text }]}>Set Time</Text>

              <View style={styles.dialContainer}>
                {/* Hours Column */}
                <View style={styles.column}>
                  <TouchableOpacity style={styles.arrowBtn} onPress={handleIncrementHour}>
                    <Ionicons name="chevron-up" size={32} color={themeColors.muted} />
                  </TouchableOpacity>
                  
                  <View style={[styles.numberBox, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                    <Text style={[styles.numberText, { color: themeColors.primary }]}>
                      {formatTimeStr(hours)}
                    </Text>
                  </View>
                  
                  <TouchableOpacity style={styles.arrowBtn} onPress={handleDecrementHour}>
                    <Ionicons name="chevron-down" size={32} color={themeColors.muted} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.colon, { color: themeColors.text }]}>:</Text>

                {/* Minutes Column */}
                <View style={styles.column}>
                  <TouchableOpacity style={styles.arrowBtn} onPress={handleIncrementMinute}>
                    <Ionicons name="chevron-up" size={32} color={themeColors.muted} />
                  </TouchableOpacity>
                  
                  <View style={[styles.numberBox, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                    <Text style={[styles.numberText, { color: themeColors.primary }]}>
                      {formatTimeStr(minutes)}
                    </Text>
                  </View>
                  
                  <TouchableOpacity style={styles.arrowBtn} onPress={handleDecrementMinute}>
                    <Ionicons name="chevron-down" size={32} color={themeColors.muted} />
                  </TouchableOpacity>
                </View>

                {/* AM/PM Column */}
                <View style={[styles.column, { marginLeft: 16 }]}>
                  <TouchableOpacity style={styles.arrowBtn} onPress={toggleAMPM}>
                    <Ionicons name="chevron-up" size={32} color={themeColors.muted} />
                  </TouchableOpacity>
                  
                  <View style={[styles.numberBox, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                    <Text style={[styles.numberText, { color: themeColors.primary, fontSize: 24 }]}>
                      {isPM ? "PM" : "AM"}
                    </Text>
                  </View>
                  
                  <TouchableOpacity style={styles.arrowBtn} onPress={toggleAMPM}>
                    <Ionicons name="chevron-down" size={32} color={themeColors.muted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: themeColors.background }]}
                  onPress={() => {
                    triggerHaptic();
                    effectiveClose();
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: themeColors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: themeColors.primary }]}
                  onPress={handleSave}
                >
                  <Text style={[styles.actionBtnText, { color: "#FFFFFF" }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 24,
  },
  dialContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  column: {
    alignItems: "center",
  },
  arrowBtn: {
    padding: 10,
  },
  numberBox: {
    width: 70,
    height: 70,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  numberText: {
    fontSize: 32,
    fontWeight: "800",
  },
  colon: {
    fontSize: 32,
    fontWeight: "800",
    marginHorizontal: 10,
    paddingBottom: 4, // Aligns colon perfectly with center of boxes
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
