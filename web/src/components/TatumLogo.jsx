import logo from '../assets/logo/tatumrestech.webp'

export default function TatumLogo({ className = '', width = 200 }) {
  return (
    <img
      src={logo}
      alt="Tatum RES Tech"
      className={className}
      style={{ width, height: 'auto', objectFit: 'contain' }}
      draggable={false}
    />
  )
}
