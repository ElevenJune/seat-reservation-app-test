import React from "react";

interface LoadingProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export const Loading: React.FC<LoadingProps> = ({
  children = "Loading...",
  ...rest
}) => {
  return <p className={"loading-overlay "+rest.className} >{children}</p>;
};
