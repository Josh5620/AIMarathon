import { useState } from 'react'
import useTheme from '../hooks/useTheme'

export default function ThemeToggle({ inline = false }) {
  const { dark, toggle } = useTheme()
  const [ripple, setRipple] = useState(false)

  function handleClick() {
    setRipple(true)
    toggle()
    setTimeout(() => setRipple(false), 600)
  }

  if (inline) {
    return (
      <>
        <style>{`
          .theme-toggle-inline {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            transition: background 0.4s ease, box-shadow 0.4s ease, transform 0.12s ease;
            flex-shrink: 0;
          }
          .theme-toggle-inline:active { transform: scale(0.88); }

          .theme-toggle-inline--light {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            box-shadow: 0 1px 8px rgba(251, 191, 36, 0.25), inset 0 1px 0 rgba(255,255,255,0.5);
          }
          .theme-toggle-inline--light:hover {
            box-shadow: 0 2px 12px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255,255,255,0.5);
          }
          .theme-toggle-inline--dark {
            background: linear-gradient(135deg, #1e1b4b, #312e81);
            box-shadow: 0 1px 8px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255,255,255,0.06);
          }
          .theme-toggle-inline--dark:hover {
            box-shadow: 0 2px 12px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.06);
          }

          .theme-toggle-inline__icon {
            position: relative;
            width: 18px;
            height: 18px;
          }

          .inline-body {
            position: absolute;
            inset: 2px;
            border-radius: 50%;
            transition: background 0.4s ease, clip-path 0.4s ease;
          }
          .inline-body--sun {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            clip-path: circle(50% at 50% 50%);
          }
          .inline-body--moon {
            background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
            clip-path: circle(50% at 62% 40%);
          }

          .inline-ray {
            position: absolute;
            width: 2px;
            height: 2px;
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .inline-ray--sun {
            background: #f59e0b;
            box-shadow: 0 0 3px rgba(245, 158, 11, 0.6);
          }
          .inline-ray--star {
            width: 1.5px;
            height: 1.5px;
            background: #e0e7ff;
            box-shadow: 0 0 3px rgba(224, 231, 255, 0.7);
            animation: inline-twinkle 2s ease-in-out infinite;
          }

          .inline-ray:nth-child(1) { --a: 0deg;   --d: 10px; --sx: -7px; --sy: -7px; animation-delay: 0s; }
          .inline-ray:nth-child(2) { --a: 60deg;  --d: 10px; --sx: 7px;  --sy: -5px; animation-delay: 0.3s; }
          .inline-ray:nth-child(3) { --a: 120deg; --d: 10px; --sx: -5px; --sy: 7px;  animation-delay: 0.7s; }
          .inline-ray:nth-child(4) { --a: 180deg; --d: 10px; --sx: 6px;  --sy: 5px;  animation-delay: 0.15s; }
          .inline-ray:nth-child(5) { --a: 240deg; --d: 10px; --sx: -8px; --sy: 1px;  animation-delay: 0.5s; }
          .inline-ray:nth-child(6) { --a: 300deg; --d: 10px; --sx: 0px;  --sy: -8px; animation-delay: 0.4s; }

          .inline-ray--sun {
            transform: translate(-50%, -50%) rotate(var(--a)) translateY(calc(-1 * var(--d)));
          }
          .inline-ray--star {
            transform: translate(-50%, -50%) translate(var(--sx), var(--sy));
          }

          @keyframes inline-twinkle {
            0%, 100% { opacity: 1; transform: translate(-50%, -50%) translate(var(--sx), var(--sy)) scale(1); }
            50% { opacity: 0.3; transform: translate(-50%, -50%) translate(var(--sx), var(--sy)) scale(0.4); }
          }
        `}</style>

        <button
          onClick={handleClick}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`theme-toggle-inline ${dark ? 'theme-toggle-inline--dark' : 'theme-toggle-inline--light'}`}
        >
          <div className="theme-toggle-inline__icon">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={`inline-ray ${dark ? 'inline-ray--star' : 'inline-ray--sun'}`} />
            ))}
            <div className={`inline-body ${dark ? 'inline-body--moon' : 'inline-body--sun'}`} />
          </div>
        </button>
      </>
    )
  }

  return (
    <>
      <style>{`
        .theme-toggle {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 50;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: background 0.5s ease, box-shadow 0.5s ease, transform 0.15s ease;
        }

        .theme-toggle:active {
          transform: scale(0.9);
        }

        .theme-toggle--light {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          box-shadow:
            0 2px 16px rgba(251, 191, 36, 0.35),
            0 0 0 2px rgba(251, 191, 36, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }
        .theme-toggle--light:hover {
          box-shadow:
            0 4px 24px rgba(251, 191, 36, 0.5),
            0 0 0 3px rgba(251, 191, 36, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        .theme-toggle--dark {
          background: linear-gradient(135deg, #1e1b4b, #312e81);
          box-shadow:
            0 2px 16px rgba(99, 102, 241, 0.3),
            0 0 0 2px rgba(99, 102, 241, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .theme-toggle--dark:hover {
          box-shadow:
            0 4px 24px rgba(99, 102, 241, 0.45),
            0 0 0 3px rgba(99, 102, 241, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .theme-toggle__icon {
          position: relative;
          width: 26px;
          height: 26px;
        }

        .celestial-body {
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          transition: background 0.45s ease, box-shadow 0.45s ease, clip-path 0.45s ease;
        }

        .celestial-body--sun {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
          clip-path: circle(50% at 50% 50%);
        }

        .celestial-body--moon {
          background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
          box-shadow: 0 0 10px rgba(199, 210, 254, 0.5);
          clip-path: circle(50% at 62% 40%);
        }

        .moon-shadow {
          position: absolute;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.15);
          top: 5px;
          right: 4px;
          transition: opacity 0.35s ease;
        }
        .moon-shadow--hidden { opacity: 0; }
        .moon-shadow--visible { opacity: 1; }

        .ray {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ray--sun {
          background: #f59e0b;
          box-shadow: 0 0 4px rgba(245, 158, 11, 0.7);
        }

        .ray--star {
          width: 2px;
          height: 2px;
          background: #e0e7ff;
          box-shadow: 0 0 4px rgba(224, 231, 255, 0.8);
          animation: twinkle 2s ease-in-out infinite;
        }

        .ray:nth-child(1) { --angle: 0deg;   --dist-sun: 15px; --star-x: -10px; --star-y: -10px; animation-delay: 0s; }
        .ray:nth-child(2) { --angle: 45deg;  --dist-sun: 15px; --star-x: 10px;  --star-y: -8px;  animation-delay: 0.3s; }
        .ray:nth-child(3) { --angle: 90deg;  --dist-sun: 15px; --star-x: -8px;  --star-y: 10px;  animation-delay: 0.7s; }
        .ray:nth-child(4) { --angle: 135deg; --dist-sun: 15px; --star-x: 8px;   --star-y: 8px;   animation-delay: 0.15s; }
        .ray:nth-child(5) { --angle: 180deg; --dist-sun: 15px; --star-x: -12px; --star-y: 2px;   animation-delay: 0.5s; }
        .ray:nth-child(6) { --angle: 225deg; --dist-sun: 15px; --star-x: 12px;  --star-y: 3px;   animation-delay: 0.9s; }
        .ray:nth-child(7) { --angle: 270deg; --dist-sun: 15px; --star-x: 0px;   --star-y: -12px; animation-delay: 0.4s; }
        .ray:nth-child(8) { --angle: 315deg; --dist-sun: 15px; --star-x: 0px;   --star-y: 12px;  animation-delay: 0.65s; }

        .ray--sun {
          transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(-1 * var(--dist-sun)));
        }

        .ray--star {
          transform: translate(-50%, -50%) translate(var(--star-x), var(--star-y));
        }

        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) translate(var(--star-x), var(--star-y)) scale(1); }
          50% { opacity: 0.3; transform: translate(-50%, -50%) translate(var(--star-x), var(--star-y)) scale(0.5); }
        }

        .theme-ripple {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          opacity: 0;
        }
        .theme-ripple--active {
          animation: ripple-out 0.6s ease-out;
        }
        .theme-ripple--light {
          background: radial-gradient(circle, rgba(251, 191, 36, 0.4), transparent 70%);
        }
        .theme-ripple--dark {
          background: radial-gradient(circle, rgba(129, 140, 248, 0.4), transparent 70%);
        }

        @keyframes ripple-out {
          0% { opacity: 1; transform: scale(0.5); }
          100% { opacity: 0; transform: scale(2.5); }
        }

        @media (max-width: 480px) {
          .theme-toggle {
            width: 44px;
            height: 44px;
            bottom: 16px;
            right: 16px;
          }
          .theme-toggle__icon {
            width: 22px;
            height: 22px;
          }
        }
      `}</style>

      <button
        onClick={handleClick}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`theme-toggle ${dark ? 'theme-toggle--dark' : 'theme-toggle--light'}`}
      >
        <div className={`theme-ripple ${ripple ? 'theme-ripple--active' : ''} ${dark ? 'theme-ripple--dark' : 'theme-ripple--light'}`} />

        <div className="theme-toggle__icon">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className={`ray ${dark ? 'ray--star' : 'ray--sun'}`}
            />
          ))}

          <div className={`celestial-body ${dark ? 'celestial-body--moon' : 'celestial-body--sun'}`}>
            <div className={`moon-shadow ${dark ? 'moon-shadow--visible' : 'moon-shadow--hidden'}`} />
          </div>
        </div>
      </button>
    </>
  )
}
