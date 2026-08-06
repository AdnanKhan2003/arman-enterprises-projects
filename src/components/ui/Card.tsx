import { View, ViewProps } from "react-native";

export function Card({ style, className, children, ...props }: ViewProps & { className?: string }) {
  return (
    <View 
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 my-2 shadow-sm ${className || ""}`}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}
