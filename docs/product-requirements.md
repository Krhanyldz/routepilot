# RoutePilot product requirements

## Product summary

RoutePilot is a multimodal journey discovery product. It compares a user's local departure with reachable nearby airports and stations, then combines flights, trains, ferries, and the local transfers needed to reach them. It recommends complete journeys rather than apparently cheap tickets whose positioning costs are hidden.

RoutePilot does not sell tickets. When live provider integrations exist, it sends users to official transport-provider booking pages. The current product is a deterministic MVP backed only by visibly labeled demo data.

## Core problem

Travel search usually starts at one airport or station and optimizes within that boundary. A cheaper or more practical journey may start in a nearby city, use a different mode for one segment, or require multiple separately booked legs. Finding those journeys manually requires comparing providers, schedules, ticket entitlements, transfer risks, and complete costs.

For example, a €300 Bremen–Antalya flight may be beaten by a regional train from Bremen to Hamburg plus a €59 Hamburg–Antalya flight. For a longer journey such as Bremen–Baotou, a useful result may join Bremen–Hamburg by train, Hamburg–Istanbul and Istanbul–Ürümqi by air, and Ürümqi–Baotou by train or air.

## Target users

- Budget-conscious leisure travelers who will trade some convenience for meaningful savings.
- Travelers living within reach of several airports or intercity stations.
- Deutschlandticket holders seeking to include eligible regional positioning travel.
- Flexible and experienced travelers comfortable evaluating self-transfers.
- Travelers planning underserved or long-haul routes that require multiple modes or bookings.

The product must remain understandable to less experienced travelers and must never hide the operational risk of a complex itinerary.

## Main value proposition

RoutePilot finds smarter, lower-cost journeys by widening the departure area and comparing the total cost, duration, transfers, and risks of valid multimodal routes. It makes the reason for a recommendation inspectable and gives the user official places to book each segment.

## Product principles

1. **Complete journey first.** Include required positioning legs and their costs in route totals.
2. **Deterministic truth.** Prices, schedules, availability, constraints, and route validity come from provider data and deterministic rules, never AI invention.
3. **Transparent trade-offs.** Show savings alongside added time, transfers, separate tickets, and connection risk.
4. **Source clarity.** Identify providers, freshness, fare conditions when known, and whether data is demo or live.
5. **User control.** Respect explicit budgets, allowed modes, duration, transfer, accessibility, and risk preferences.
6. **No false protection.** Never imply that separate bookings or self-transfers have through-ticket protection.
7. **Redirect, do not retail.** RoutePilot discovers and compares; providers handle booking and payment.
8. **Supported modes only.** Flight, train, and ferry are the only transport modes. Bus transport is not supported.
9. **Graceful uncertainty.** Missing or stale information must be disclosed rather than guessed.

## User journeys

### Compare a local departure with nearby alternatives

1. The user selects an origin, destination, dates, traveler details, and preferences.
2. RoutePilot resolves the origin and discovers airports and stations within the chosen reach.
3. It obtains normalized offers and builds valid direct and multimodal candidates.
4. It calculates complete traveler-specific costs, validates constraints, and ranks results.
5. The user compares routes by cost, duration, transfers, and risk.
6. The user follows official booking links for the chosen route's segments.

### Evaluate a complex long-haul route

The user searches an underserved destination. RoutePilot may return multiple flight legs and a final rail or air choice. The result identifies each transfer, separate booking boundary, provider, total duration and cost, and any self-transfer risk so the user can make an informed choice.

### Search with a Deutschlandticket

The user declares that every relevant traveler holds a valid Deutschlandticket. Eligible regional transport is priced according to the ticket rule, while non-eligible services, reservations, supplements, and local transport remain included when applicable. The result shows both the normal amount and the amount covered.

### Recover from no result

If no route meets the constraints, RoutePilot explains which constraints prevented a result and suggests safe adjustments such as widening the nearby radius, allowing more time or transfers, changing dates, or re-enabling a supported mode. It does not invent an unavailable route.

## Search inputs

The product foundation should support:

- Origin and destination as resolved location entities, not unvalidated free text.
- Outbound date and optional return date; date flexibility when introduced.
- Number and types of travelers where provider pricing supports them.
- One-way or return journey.
- Allowed modes: flight, train, and ferry only.
- Nearby departure discovery on/off and a distance or travel-time reach limit.
- Maximum total budget, duration, and transfers.
- Deutschlandticket ownership for each traveler to whom it applies.
- Preference for cheapest, fastest, best value, fewest transfers, or lowest risk.
- Willingness to accept self-transfers, separate bookings, overnight connections, or airport/station changes.
- Accessibility and mobility needs when reliable provider data is available.

Unknown or unsupported inputs must be explained. Dates, budgets, locations, and traveler counts must be validated before provider search.

## Route result requirements

Every result must show:

- Origin, destination, and a chronological list of legs.
- Mode, operator/provider source, departure and arrival locations, local date/time, and duration for every leg when live data supports them.
- Any airport, station, port, terminal, or city change between legs.
- Total traveler-specific price and currency, plus a leg-level price breakdown.
- Total elapsed journey duration, including known connection waits, and total transfers.
- Whether a leg or result uses demo data, cached data, or unavailable fields.
- Separate-ticket and self-transfer boundaries, with protection status described accurately.
- Deutschlandticket coverage and excluded costs.
- Fare, baggage, reservation, refund, and availability limitations when supplied by providers.
- A stable explanation of why it was selected and the trade-offs against meaningful alternatives.
- Official booking links per independently bookable itinerary or leg.

Results must not combine offers whose times, locations, modes, availability, booking boundaries, or connection rules make the itinerary invalid. Ranking must be deterministic and reproducible for the same normalized inputs and policy version. A displayed total must use a clearly stated currency and conversion timestamp when conversion is required.

## Nearby airport and station discovery

RoutePilot must resolve nearby airports and stations from authoritative location data. Candidates must be deduplicated, operational, and compatible with the user's chosen modes. Discovery should eventually consider ground travel time and service availability, not only straight-line distance.

The route engine must include the time and price of reaching a nearby departure point. A nearby location without a valid positioning connection must not be presented as usable. The UI must state which departure points were considered and why candidates were excluded when that is useful. Ports may participate as ferry endpoints, but the supported nearby-departure requirement is specifically airports and stations.

## Multimodal routing

Routing operates on normalized provider offers and location identifiers. It may join flight, train, and ferry legs when temporal ordering, connection constraints, user preferences, and supported-mode rules permit. Transfers within or between transport hubs must be modeled explicitly when they require time, cost, or a change of location.

The engine must prevent cycles, enforce maximum duration and transfer constraints, and avoid impossible connections. Minimum connection buffers should account for mode changes, terminal or station changes, border processes, baggage collection, and self-transfer status as reliable data becomes available. Bus legs must never be generated or accepted.

## Total-cost calculation

The total is the sum of all known traveler-specific costs required to complete the displayed route, including:

- Transport fares for every leg.
- Positioning travel to a nearby departure point.
- Mandatory reservations, supplements, booking fees, or transfers when provided.
- Currency conversion using a timestamped rate when offers differ in currency.
- Deutschlandticket discounts only where eligibility is confirmed.

Optional baggage, seat selection, meals, lodging, local transport without reliable pricing, and other uncertain costs must be itemized separately or marked as not included. RoutePilot must not silently estimate them. Price freshness and fare availability must be visible for live results. Price arithmetic must be deterministic and use appropriate minor-unit or decimal handling; AI must never calculate it.

## Self-transfer risk handling

A self-transfer exists when a connection is not protected as one through itinerary or requires the traveler to manage baggage, check-in, security, immigration, or a terminal/location change independently. RoutePilot must:

- Label every known self-transfer prominently before redirecting to booking.
- Distinguish confirmed protected connections, confirmed self-transfers, and unknown protection status.
- Explain that a missed onward separately booked service may not be rebooked or refunded.
- Use conservative, deterministic minimum connection rules and reject candidates below them.
- Surface baggage recheck, border, visa, overnight, and airport/station-change considerations when known.
- Never describe an itinerary as protected without provider evidence.

Risk indicators are decision support, not guarantees. Unknown data must increase disclosure, not be interpreted as safety.

## Deutschlandticket handling

Deutschlandticket ownership is a traveler-specific input. A leg may be reduced to zero incremental fare only when the normalized product and service are confirmed eligible and the ticket applies to every traveler represented by that price. The UI must show the undiscounted fare, applied reduction, and resulting price.

RoutePilot must not assume coverage for long-distance trains, reservations, supplements, first class, local exceptions, or travel outside the valid area. Eligibility rules require a version/effective date and must be updated when official terms change. If eligibility cannot be established, the normal fare remains in the total and uncertainty is disclosed.

## Booking-link behavior

RoutePilot does not book, issue, hold, or sell tickets and does not process payment. A booking action redirects to an official provider or authorized partner page. For separate bookings, links are presented in route order with clear segment coverage, price freshness, and self-transfer warnings.

Before display or redirect, URLs must pass scheme, host, and provider allowlist validation. RoutePilot must not manufacture deep links or imply that a redirect preserves the displayed fare or availability. If a deep link is invalid or expired, use a validated provider search page or disable the action with an explanation. Affiliate relationships must be disclosed and must not alter ranking without an explicit sponsored label.

## Demo-data labeling

All current records and user-facing results must be visibly and consistently labeled **Demo data**. Demo prices, schedules, availability, locations, recommendations, and discovery cards must not be described as live. Demo and live offers must not be silently mixed. If demo fallback is used after a live-provider failure, it must appear in a separate, clearly labeled experience and must never look bookable.

## Safety and visa disclaimers

Visa, entry, transit, health, and safety information is contextual guidance, not legal or governmental advice. RoutePilot must identify the source, jurisdiction, publication/update time, and applicable nationality or traveler assumptions. It must link users to official government or recognized authoritative sources and advise verification before booking and departure.

RoutePilot must not claim that a traveler may enter or transit a country based on incomplete profile information. It must not infer that absence of an alert means a route is safe. Urgent warnings and uncertainty must be prominent, but RoutePilot does not replace official authorities, consulates, carriers, or personal risk assessment.

## Accessibility and mobile requirements

- Meet WCAG 2.2 AA as the product target.
- Support keyboard-only use, visible focus, semantic headings and forms, associated labels, useful error messages, and screen-reader announcements for search state and updated results.
- Never communicate mode, price change, or risk by color alone.
- Respect reduced-motion and text-size preferences and maintain sufficient contrast.
- Keep touch targets usable and avoid horizontal page scrolling at common mobile widths.
- Present dense route timelines as a readable single-column flow on small screens.
- Keep essential disclosures, total cost, and booking boundaries available without hover.
- Provide accessible date, location, and filter controls and retain entered values after validation errors.

Accessibility details supplied by transport providers must be attributed and their freshness shown. The absence of data must not be treated as accessibility.

## MVP scope

The current MVP includes:

- Deterministic, labeled demo data for locations and flight, train, and ferry offers.
- Bremen–Antalya and Bremen–Baotou demo scenarios.
- Nearby airport and station discovery using a selectable straight-line radius.
- Constrained graph search across normalized offers.
- Total fare calculation with a deterministic Deutschlandticket rule.
- Filters for supported modes, budget, duration, transfers, nearby departures, and radius.
- Deterministic business-rule explanations and visible self-transfer messaging.
- A responsive comparison UI with no live booking capability.

The MVP demonstrates the routing proposition; it does not establish live price or schedule coverage.

## Explicit non-goals

- Bus transport, bus providers, or bus routing.
- Ticket sales, checkout, payment, ticket issuance, or post-booking support.
- Authentication, accounts, saved routes, or alerts in the MVP.
- Real external API calls or claims of live availability in the demo MVP.
- AI-generated routes, prices, schedules, availability, visa decisions, or safety claims.
- Replacing official visa, border, health, or safety advice.
- Guaranteed connections, guaranteed savings, or guaranteed displayed fares.
- Hidden sponsored ranking or undisclosed affiliate influence.
- Refactoring the working engine or UI as part of this documentation foundation.
