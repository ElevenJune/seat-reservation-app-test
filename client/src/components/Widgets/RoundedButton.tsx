import "./RoundedButton.css";

interface RoundedButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  marginTop?: string;
  width?: string;
  height?: string;
  backgroundColor?:string;
  color?:string
}

export const RoundedButton: React.FC<RoundedButtonProps> = ({
  children,
  onClick,
  width = "",
  height = "",
  marginTop = "0px",
  backgroundColor = "transparent",
  color = "var(--text-main)"
}) => {
  return (
    <button
      className="rounded-button"
      onClick={onClick}
      style={
        {
          "--btn-width": width,
          "--btn-height": height,
          "--btn-margin-top": marginTop,
          "--btn-color": color,
          "--btn-bg": backgroundColor,
        } as React.CSSProperties
      }
    >
      {children}
    </button>
  );
};
