import { useNavigate } from "react-router-dom";
import { RoundedButton } from "../Widgets/RoundedButton";
import "./Toolbar.css";

export const Toolbar = () => {
  const navigate = useNavigate();
  return (
    <div className="nav-back">
      <header className="page-container">
        <div className="navbar">
          <RoundedButton id="back" onClick={() => navigate(-1)}>
            Back
          </RoundedButton>
          <RoundedButton onClick={() => navigate("/")}>Home</RoundedButton>
        </div>
      </header>
    </div>
  );
};
