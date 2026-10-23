import { Link, useNavigate } from "react-router-dom";
import { RoundedButton } from "../Widgets/RoundedButton";
import "./Toolbar.css";

export const Toolbar = () => {
  const navigate = useNavigate();
  return (
    <div className="navbar">
      <ul>
        <li>
          <RoundedButton onClick={() => navigate(-1)}>
            Back
          </RoundedButton>
        </li>
        <li>
          <RoundedButton onClick={() => navigate("/")}>
            Home
          </RoundedButton>
        </li>
        <li>stretch</li>
      </ul>
    </div>
  );
};
