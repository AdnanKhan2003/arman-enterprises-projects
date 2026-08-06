import React from "react";
import { View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Screen({ children, style, className, ...props }: ViewProps & { className?: string }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      className={`flex-1 bg-white dark:bg-slate-900 ${className || ""}`}
      style={[
        { paddingTop: insets.top, paddingBottom: insets.bottom },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
