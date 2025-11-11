import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [txId, setTxId] = useState(null);
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:4001");
    wsRef.current.onmessage = (msg) => {
      const ev = JSON.parse(msg.data);
      setEvents((prev) => [...prev, ev]);
    };
    return () => wsRef.current.close();
  }, []);

  async function startTransaction() {
    const res = await fetch("http://localhost:3001/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromAccount: "A1", toAccount: "A2", amount: 100 }),
    });
    const data = await res.json();
    setTxId(data.transactionId);

    wsRef.current.send(
      JSON.stringify({ action: "subscribe", transactionId: data.transactionId })
    );

    setEvents([]);
  }

  function renderEvent(e) {
    let mensaje = "";
    let color = "#444"; 

    switch (e.type) {
      case "FundsReserved":
        mensaje = `💰 Fondos reservados: $${e.payload.amount}`;
        color = "#0070f3"; 
        break;
      case "FraudChecked":
        if (e.payload.risk === "HIGH") {
          mensaje = "⚠️ Riesgo de fraude alto";
          color = "#d93025"; 
        } else {
          mensaje = "✅ No hay fraude detectado";
          color = "#16a34a"; 
        }
        break;
      case "Reversed":
        mensaje = `❌ Transacción revertida por ${e.payload.reason}`;
        color = "#d93025"; 
        break;
      case "Committed":
        mensaje = `🏦 Transferencia completada con éxito (asiento ${e.payload.ledgerId})`;
        color = "#16a34a"; 
        break;
      case "Notified":
        mensaje = "📩 Usuario notificado correctamente";
        color = "#6b21a8"; 
        break;
      default:
        mensaje = `${e.type} - ${JSON.stringify(e.payload)}`;
        color = "#666";
    }

    return (
      <div
        key={e.type + Math.random()}
        style={{
          marginBottom: "10px",
          padding: "10px 14px",
          borderLeft: `6px solid ${color}`,
          background: "#fbf9faff",
          borderRadius: "6px",
          fontSize: "15px",
          color: "#222",
          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
        }}
      >
        {mensaje}
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "Segoe UI, sans-serif",
        background: "#f5f3f0ff",
        minHeight: "100vh",
        padding: "40px",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ textAlign: "center", color: "#111", marginBottom: 20 }}>
           Prototipo de sistema bancario con Kafka
        </h1>

        <button
          onClick={startTransaction}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            fontWeight: "bold",
            color: "white",
            backgroundColor: "#0070f3",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background 0.3s",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#0059c1")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#0070f3")}
        >
          Iniciar transacción
        </button>

        {txId && (
          <div
            style={{
              marginTop: 20,
              background: "#fff6eaff",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #0070f3",
              color: "#004085",
              fontSize: "14px",
            }}
          >
            <strong>ID de Transacción:</strong> {txId}
          </div>
        )}

        <div style={{ marginTop: 25 }}>
          {events.length === 0 ? (
            <p style={{ textAlign: "center", color: "#666" }}>
              No hay eventos aún.
            </p>
          ) : (
            events.map(renderEvent)
          )}
        </div>
      </div>
    </div>
  );
}
