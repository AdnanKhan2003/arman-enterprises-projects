import { TextInput, TextInputProps, View } from "react-native";
import { Text } from "./Text";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  rightIcon?: React.ReactNode;
}

export function Input({ style, className, containerClassName, label, error, rightIcon, ...props }: InputProps & { className?: string }) {
  return (
    <View className={`mb-4 ${containerClassName || ""}`}>
      {label && <Text className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">{label}</Text>}
      <View className="relative justify-center">
        <TextInput 
          className={`border rounded-lg p-3.5 text-[15px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 ${error ? "border-red-500 dark:border-red-500" : ""} ${rightIcon ? "pr-12" : ""} ${className || ""}`}
          style={style}
          placeholderTextColor="#64748b"
          {...props}
        />
        {rightIcon && (
          <View className="absolute right-0 pr-3 z-10 flex h-full justify-center">
            {rightIcon}
          </View>
        )}
      </View>
      {error && <Text className="text-red-500 text-xs mt-1.5">{error}</Text>}
    </View>
  );
}
