import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { useAuth } from "../auth/AuthContext";
import "./LoginPage.css";

gsap.registerPlugin(Draggable);

const OFF_COLOR = "#121417";
const ON_COLOR = "#1c1f24";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOn, setIsOn] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const cordBeadRef = useRef<SVGCircleElement>(null);
  const cordLineRef = useRef<SVGLineElement>(null);
  const hitAreaRef = useRef<SVGCircleElement>(null);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const isOnRef = useRef(false);

  const toggleLamp = () => {
    const next = !isOnRef.current;
    isOnRef.current = next;
    setIsOn(next);
    clickSoundRef.current?.play().catch(() => {});
    gsap.to(pageRef.current, { backgroundColor: next ? ON_COLOR : OFF_COLOR, duration: 0.6 });
  };

  useEffect(() => {
    clickSoundRef.current = new Audio("https://assets.codepen.io/605876/click.mp3");

    const [draggable] = Draggable.create(hitAreaRef.current, {
      type: "y",
      bounds: { minY: 0, maxY: 60 },
      onDrag() {
        gsap.set(cordBeadRef.current, { y: this.y });
        gsap.set(cordLineRef.current, { attr: { y2: 180 + this.y } });
      },
      onRelease() {
        if (this.y > 30) toggleLamp();
        gsap.to([cordBeadRef.current, hitAreaRef.current], { y: 0, duration: 0.5, ease: "back.out(2.5)" });
        gsap.to(cordLineRef.current, { attr: { y2: 180 }, duration: 0.5, ease: "back.out(2.5)" });
      },
    });

    return () => {
      draggable.kill();
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      const timedOut = axiosIsTimeout(err);
      setError(
        timedOut
          ? "Le serveur met du temps à répondre (réveil à froid sur Render) — réessaie dans quelques secondes."
          : "Identifiants invalides."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="lamp-page"
      data-on={isOn}
      ref={pageRef}
      style={{ "--on": isOn ? 1 : 0 } as CSSProperties}
    >
      <div className="lamp-container">
        <div className="lamp-wrapper">
          <svg className="lamp-svg" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
            <ellipse className="inner-glow" cx="100" cy="110" rx="60" ry="30" />
            <rect className="lamp-base" x="92" y="100" width="16" height="160" rx="8" />
            <rect className="lamp-base" x="60" y="250" width="80" height="12" rx="6" />
            <g className="pull-cord">
              <line ref={cordLineRef} className="cord-line" x1="130" y1="110" x2="130" y2="180" />
              <circle ref={cordBeadRef} className="cord-bead" cx="130" cy="190" r="6" />
              <circle ref={hitAreaRef} className="cord-hit" cx="130" cy="190" r="25" fill="transparent" />
            </g>
            <path className="lamp-shade" d="M30 110 C 30 50, 170 50, 170 110 C 170 125, 30 125, 30 110 Z" />
          </svg>
        </div>

        <form className={`lamp-login-form${isOn ? " active" : ""}`} onSubmit={onSubmit}>
          <h2>Koulango — Administration</h2>

          <div className="lamp-form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              tabIndex={isOn ? 0 : -1}
              required
            />
          </div>

          <div className="lamp-form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              tabIndex={isOn ? 0 : -1}
              required
            />
          </div>

          {error && <p className="lamp-error">{error}</p>}

          <button className="lamp-login-btn" type="submit" disabled={loading} tabIndex={isOn ? 0 : -1}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>

          <p className="lamp-hint">Tire la cordelette pour allumer la lampe.</p>
        </form>
      </div>
    </div>
  );
}

function axiosIsTimeout(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "ECONNABORTED";
}
