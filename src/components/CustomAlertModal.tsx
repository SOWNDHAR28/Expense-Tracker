import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

type CustomAlertModalProps = {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
  cancelText?: string;
  confirmText?: string;
  confirmColor?: string;
  onCancel?: () => void;
  onConfirm: () => void;
  showCancel?: boolean;
};

export default function CustomAlertModal({
  visible,
  title,
  message,
  icon = "alert-circle-outline",
  iconColor,
  iconBg,
  cancelText = "Cancel",
  confirmText = "Confirm",
  confirmColor,
  onCancel,
  onConfirm,
  showCancel = true,
}: CustomAlertModalProps) {
  const { themeColors } = useTheme();

  const activeIconColor = iconColor || themeColors.expense;
  const activeIconBg = iconBg || themeColors.softExpense;
  const activeConfirmBg = confirmColor || themeColors.expense;

  const handleBackdropPress = () => {
    if (showCancel && onCancel) {
      onCancel();
    } else {
      onConfirm();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={showCancel ? onCancel : onConfirm}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.border,
                },
              ]}
            >
              {/* Header Icon */}
              <View style={[styles.iconWrap, { backgroundColor: activeIconBg }]}>
                <Ionicons name={icon as any} size={32} color={activeIconColor} />
              </View>

              {/* Title & Message */}
              <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
              <Text style={[styles.message, { color: themeColors.muted }]}>{message}</Text>

              {/* Action Buttons Row */}
              <View style={styles.buttonRow}>
                {showCancel && onCancel && (
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      styles.cancelBtn,
                      { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                    ]}
                    onPress={onCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.cancelBtnText, { color: themeColors.text }]}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: activeConfirmBg }]}
                  onPress={onConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmBtnText}>{confirmText}</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 330,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
