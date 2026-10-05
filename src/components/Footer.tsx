import { Link } from 'react-router-dom'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer__inner section-inner">
        <img
          className="footer__brand"
          src="/images/bosslabai-logo.webp"
          alt="SonicRing"
          width={2048}
          height={682}
        />

        <nav className="footer__links" aria-label="Legal">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <span className="footer__dot" aria-hidden="true">
            ·
          </span>
          <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
        </nav>

        <p className="footer__copy">
          © {year} SonicRing. All Rights Reserved.
        </p>

        <p className="footer__note">
          This website is not a part of Facebook or Google. Additionally, this
          site is not endorsed by or affiliated to Facebook or Google. All brands
          shown on this site belong to its respective owners.
        </p>
      </div>
    </footer>
  )
}
