import "./RoundedButton.css";
interface RoundedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  additionalClassName?: string;
  variant?: "primary" | "secondary" | "ghost";
}

export const RoundedButton: React.FC<RoundedButtonProps> = ({
  children,
  additionalClassName,
  variant = "primary",
  ...rest
}) => {
  return (
    <button
      className={`rounded-button ${variant} ${additionalClassName}`}
      {...rest}
    >
      {children}
    </button>
  );
};
