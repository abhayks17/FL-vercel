import React from "react";
import { QRCodeCanvas } from "qrcode.react";

const QRCodeGenerator = ({ tagId }) => {
  if (!tagId) return null;

  return (
    <div style={{ textAlign: "center", marginTop: "1rem" }}>
      <QRCodeCanvas value={tagId} size={180} />
      <p style={{ marginTop: "0.5rem" }}>{tagId}</p>
    </div>
  );
};

export default QRCodeGenerator;