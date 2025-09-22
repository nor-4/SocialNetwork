import React from 'react'
import './Spinner.css'

type props = {
  size?: string
  color?: string
  children?: any
}

const Spinner = ({size = '40px', color = '#AAA', children}: props) => {
  const spinnerStyle = {
    width: size,
    height: size,
    borderTopColor: color,
    borderRightColor: color,
    borderBottomColor: color,
    borderLeftColor: 'transparent',
  }

  return (
    <div className="flex flex-col justify-center items-center gap-4">
      <div className="spinner" style={spinnerStyle}></div>
      {children}
    </div>
  )
}

export default Spinner
