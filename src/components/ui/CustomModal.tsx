import React from "react";
import { Modal, ModalProps, View } from "react-native";

interface CustomModalProps extends ModalProps {
  visible: boolean;
  children: React.ReactNode;
  containerClassName?: string;
}

export function CustomModal({ visible, children, containerClassName, animationType = "fade", ...props }: CustomModalProps) {
  return (
    <Modal visible={visible} animationType={animationType} transparent {...props}>
      <View className="flex-1 justify-center p-5" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View className={`rounded-2xl p-6 shadow-lg bg-white dark:bg-slate-800 ${containerClassName || ""}`}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
