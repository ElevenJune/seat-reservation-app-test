import "./RoundedButton.css";

interface RoundedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface RoundedButtonProps {
  children: React.ReactNode;
  additionalClassName?: string;
  marginTop?: string;
  width?: string;
  height?: string;
  backgroundColor?: string;
  color?: string
}

export const RoundedButton: React.FC<RoundedButtonProps> = ({
  children,
  additionalClassName,
  width = "",
  height = "",
  marginTop = "0px",
  backgroundColor = "transparent",
  color = "var(--secondary)",
  ...rest
}) => {
  return (
    <button
      className={"rounded-button "+additionalClassName}
      style={
        {
          "--btn-width": width,
          "--btn-height": height,
          "--btn-margin-top": marginTop,
          "--btn-color": color,
          "--btn-bg": backgroundColor,
        } as React.CSSProperties
      }
      {...rest}
    >
      {children}
    </button>
  );
};
