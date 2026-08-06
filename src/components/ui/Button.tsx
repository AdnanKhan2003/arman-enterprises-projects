import { Pressable, PressableProps, ActivityIndicator } from "react-native";
import { Text } from "./Text";

interface ButtonProps extends PressableProps {
  title: string;
  variant?: "primary" | "secondary" | "outline";
  loading?: boolean;
  className?: string;
}

export function Button({ style, className, title, variant = "primary", loading = false, disabled, ...props }: ButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-slate-900 dark:bg-slate-50";
      case "secondary":
        return "bg-slate-100 dark:bg-slate-700";
      case "outline":
        return "bg-transparent border border-slate-200 dark:border-slate-600";
    }
  };

  const getTextClasses = () => {
    switch (variant) {
      case "primary":
        return "text-white dark:text-slate-900";
      case "secondary":
        return "text-slate-900 dark:text-slate-50";
      case "outline":
        return "text-slate-900 dark:text-slate-50";
    }
  };

  const getIndicatorColor = () => {
    return variant === "primary" ? "#94a3b8" : "#64748b"; // fallback color, normally we'd want text color
  };

  return (
    <Pressable 
      className={`py-3.5 px-6 rounded-lg items-center justify-center active:opacity-70 ${getVariantClasses()} ${(disabled || loading) ? "opacity-60" : ""} ${className || ""}`}
      style={style as any}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getIndicatorColor()} />
      ) : (
        <Text className={`text-[15px] font-semibold ${getTextClasses()}`}>{title}</Text>
      )}
    </Pressable>
  );
}
