import React from "react";
import { Modal, ModalProps, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CustomModalProps extends ModalProps {
  visible: boolean;
  children: React.ReactNode;
  containerClassName?: string;
  title?: string;
  onClose?: () => void;
}

export function CustomModal({ visible, children, containerClassName, animationType = "fade", title, onClose, ...props }: CustomModalProps) {
  return (
    <Modal visible={visible} animationType={animationType} transparent {...props}>
      <View className="flex-1 justify-center p-5" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View className={`rounded-2xl p-6 shadow-lg bg-white dark:bg-slate-800 ${containerClassName || ""}`}>
          {(title || onClose) && (
            <View className="flex-row justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <Text className="text-xl font-bold text-slate-900 dark:text-slate-50">{title}</Text>
              {onClose && (
                <Pressable onPress={onClose} className="p-1">
                  <Ionicons name="close" size={24} color="#64748B" />
                </Pressable>
              )}
            </View>
          )}
          {children}
        </View>
      </View>
    </Modal>
  );
}
