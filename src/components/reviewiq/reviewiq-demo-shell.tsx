"use client";

import { useMemo, useState } from "react";
import { ReviewIqClient } from "@/components/reviewiq/reviewiq-client";
import type { DemoHydratedCustomer } from "@/lib/reviewiq/types";

type ReviewIqDemoShellProps = {
  customers: DemoHydratedCustomer[];
};

export function ReviewIqDemoShell({ customers }: ReviewIqDemoShellProps) {
  const [customerProfiles, setCustomerProfiles] = useState(customers);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const activeCustomer = useMemo(
    () => customerProfiles.find((customer) => customer.id === activeCustomerId) ?? null,
    [activeCustomerId, customerProfiles]
  );

  function handleCustomerUpdate(updatedCustomer: DemoHydratedCustomer) {
    setCustomerProfiles((current) =>
      current.map((customer) => (customer.id === updatedCustomer.id ? updatedCustomer : customer))
    );
  }

  async function handleResetDemoData() {
    setResetting(true);

    try {
      const response = await fetch("/api/demo/reset", {
        method: "POST"
      });

      const payload = (await response.json()) as {
        customers?: DemoHydratedCustomer[];
      };

      if (response.ok && payload.customers) {
        setCustomerProfiles(payload.customers);
        setActiveCustomerId(null);
      }
    } finally {
      setResetting(false);
    }
  }

  if (!activeCustomer) {
    return (
      <div className="demo-picker-shell">
        <div className="demo-picker-card">
          <div className="demo-picker-head">
            <div>
              <p className="pg-eye">Demo Profiles</p>
              <h1 className="pg-h1">Choose a seeded Expedia customer</h1>
            </div>
            <button className="demo-reset-btn" disabled={resetting} onClick={() => handleResetDemoData().catch(() => undefined)} type="button">
              {resetting ? "Resetting..." : "Reset All Demo Data"}
            </button>
          </div>

          <div className="demo-profile-grid">
            {customerProfiles.map((customer) => {
              const reviewedCount = customer.journal.reviewedStayIds.length;
              const trip = customer.trips[0];

              return (
                <button
                  className="demo-profile-card"
                  key={customer.id}
                  onClick={() => setActiveCustomerId(customer.id)}
                  type="button"
                >
                  <div className="demo-profile-top">
                    <div>
                      <div className="demo-profile-name">{customer.name}</div>
                      <div className="demo-profile-headline">
                        {customer.stays.length} recent {customer.stays.length === 1 ? "stay" : "stays"}
                      </div>
                    </div>
                  </div>

                  <div className="demo-profile-band">
                    <div>
                      <span>Trip</span>
                      <strong>{trip?.title ?? "Recent trip"}</strong>
                    </div>
                    <div>
                      <span>Stampedia</span>
                      <strong>
                        {reviewedCount}/{customer.stays.length} stamped
                      </strong>
                    </div>
                  </div>

                  <div className="demo-profile-stays">
                    {customer.stays.slice(0, 4).map((stay) => (
                      <div className="demo-profile-stay" key={stay.stayId}>
                        <span>{stay.property.displayName}</span>
                      </div>
                    ))}
                  </div>

                  <span className="demo-profile-enter">Open customer</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReviewIqClient
      customer={activeCustomer}
      key={activeCustomer.id}
      onBackToCustomers={() => setActiveCustomerId(null)}
      onCustomerUpdate={handleCustomerUpdate}
    />
  );
}
