import React from "react";
import { QRCodeCanvas } from "qrcode.react";

const QRGenerator = ({ tagId }) => {
  if (!tagId) return null;

  return (
    <canvas
      id={`qr-${tagId}`} // 🔥 UNIQUE ID
      style={{ display: "none" }}
      ref={(node) => {
        if (node) {
          const qr = document.createElement("div");
        }
      }}
    >
      <QRCodeCanvas
        value={tagId}
        size={260}
        level="H"
        includeMargin={true}
      />
    </canvas>
  );
};

export default QRGenerator;