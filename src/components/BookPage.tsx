import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.ts";
import { zodEnv } from "../lib/zodEnv.ts";
import type { PublicShop, Service } from "../types/booking.ts";

export default function BookPage() {
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const shopRes = await apiFetch(`${zodEnv.BACKEND_URL}/admin/shop`);
        if (!shopRes.ok) throw new Error("Failed to load shop");
        const shopJson = await shopRes.json();
        setShop(shopJson.shop);

        const shopId = shopJson.shop?.id ?? shopJson.shop?._id;
        if (shopId) {
          const svcRes = await apiFetch(`${zodEnv.BACKEND_URL}/admin/services?shopId=${shopId}`);
          if (!svcRes.ok) throw new Error("Failed to load services");
          const svcJson = await svcRes.json();
          setServices(svcJson.services);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, []);

  if (error) return <div>{error}</div>;
  if (!shop) return <div>Loading…</div>;

  return (
    <div>
      <h1>{shop.shopName}</h1>
      <p>{shop.location}</p>
      <p>{shop.phone}</p>
      <h2>Opening timings</h2>
      <ul>
        {Object.entries(shop.openingTimings).map(([day, time]) => (
          <li key={day}>
            {day}: {time}
          </li>
        ))}
      </ul>
      {shop.shopImages?.length && (
        <>
          <h2>Shop images</h2>
          <ul>
            {shop.shopImages.map((src) => (
              <li key={src}>
                <img src={src} alt="" />
              </li>
            ))}
          </ul>
        </>
      )}
      <h2>Services</h2>
      <ul>
        {services.map((svc) => (
          <li key={svc.id ?? svc._id}>
            <h3>{svc.serviceName}</h3>
            {svc.basePrice !== undefined && svc.basePrice !== null && (
              <p>
                <strong>Base Price:</strong>{" "}
                {typeof svc.basePrice === "number"
                  ? `₹${svc.basePrice}`
                  : svc.basePrice.toString().startsWith("₹")
                  ? svc.basePrice
                  : `₹${svc.basePrice}`}
              </p>
            )}
            <p>{svc.serviceType}</p>
            <p>{svc.serviceDuration}</p>
            {svc.serviceImages?.length && (
              <ul>
                {svc.serviceImages.map((src: string) => (
                  <li key={src}>
                    <img src={src} alt="" />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
