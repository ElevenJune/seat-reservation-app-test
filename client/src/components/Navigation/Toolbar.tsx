import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { RoundedButton } from "../Widgets/RoundedButton";
import "./Toolbar.css";

export const Toolbar = () => {
  const [isHome, setIsHome] = useState(false);
  const [isCart, setIsCart] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
    useEffect(() => {
      setIsHome(location.pathname==="/")
      setIsCart(location.pathname==="/cart")
    }, [location]);
  return (
    <div className="nav-back">
      <header className="page-container" style={{paddingBottom:"0px"}}>
        <div className="navbar">
          <RoundedButton  variant="ghost" id="back" onClick={() => {navigate(-1);}}>
            {window.history.length>0 ? "Back" : "No"}
          </RoundedButton>
          <RoundedButton disabled={isHome} variant="ghost" onClick={() => { navigate("/");}}>Home</RoundedButton>
          <RoundedButton disabled={isCart} variant="ghost" id="cart" onClick={() => { navigate("/cart");}}>Cart</RoundedButton>
        </div>
      </header>
    </div>
  );
};
