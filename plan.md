# Forecasts & Alerts Admin Page Design

## Layout Structure

### 1. Region Filter Component
```
┌─────────────────────────────────────────┐
│ 🌍 Region Filter                        │
│ [Search Region] [Current Filters: Tags] │
└─────────────────────────────────────────┘
```

### 2. Main Grid Layout
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 3rd Party   │ │ AI-based    │ │ Crowdsource │
│ Forecasts   │ │ Forecasts   │ │ Forecasts   │
├─────────────┤ ├─────────────┤ ├─────────────┤
│ Trust: 95%  │ │ Trust: 87%  │ │ Trust: 82%  │
│ Critical: H │ │ Critical: M │ │ Critical: L │
├─────────────┤ ├─────────────┤ ├─────────────┤
│ [Forecast   │ │ [Forecast   │ │ [Forecast   │
│  List]      │ │  List]      │ │  List]      │
│             │ │             │ │             │
│             │ │ [Approve]   │ │ [Approve]   │
│             │ │ [Reject]    │ │ [Reject]    │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Component Specifications

### Region Filter
- Sticky position at top
- Search input with autocomplete
- Active filter tags with remove option
- Clear all filters button

### Forecast Section Card
- Trust Score: Circular progress indicator
- Criticality Score: Color-coded badge (H/M/L)
- Forecast List: Scrollable container
- Approval Actions (AI/Crowdsourced only):
  - Approve button: Success color
  - Reject button: Danger color

### Forecast Item
```
┌───────────────────────────────────┐
│ [Icon] Forecast Title             │
│ Location • DateTime               │
│ Description                       │
│ [Severity Badge] [Source Badge]   │
└───────────────────────────────────┘
```

## Responsive Design Implementation

### Desktop (>= 1200px)
```
[ Region Filter              ]
[Card 1] [Card 2] [Card 3]  // 3-column grid
```
- Full three-column layout
- Fixed-width region filter
- Cards maintain minimum width of 350px
- Horizontal spacing between cards: 24px

### Tablet (768px - 1199px)
```
[ Region Filter         ]
[Card 1] [Card 2]      // 2-column grid
[Card 3]               // Wraps to next row
```
- Two-column layout
- Cards stack in 2 columns
- Minimum card width: 300px
- Horizontal spacing: 20px
- Vertical spacing between rows: 24px

### Mobile (< 768px)
```
[ Region Filter ]
[   Card 1     ]  // Single column
[   Card 2     ]  // Full width cards
[   Card 3     ]
```
- Single column layout
- Full-width cards
- Vertical spacing: 16px
- Compact padding inside cards
- Collapsible sections for better space usage
- Touch-friendly button sizes (min 44px)

## CSS Implementation Notes

```css
.forecasts-grid {
  display: grid;
  gap: 24px;
  padding: 20px;
  
  /* Desktop */
  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  /* Tablet */
  @media (min-width: 768px) and (max-width: 1199px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* Mobile */
  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
  }
}

.forecast-card {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 767px) {
    min-height: 300px;
  }
}
```

## Interactive Features
1. Region Filter:
   - Instant filtering
   - Autocomplete suggestions
   - Multiple region selection

2. Forecast Lists:
   - Infinite scroll
   - Sort by criticality/time
   - Quick action buttons

3. Approval Actions:
   - Confirmation dialogs
   - Batch approval option
   - Comment/feedback field

## Data Structure

```typescript
interface ForecastItem {
  id: string;
  title: string;
  description: string;
  location: {
    region: string;
    coordinates: {
      lat: number;
      lng: number;
    }
  };
  timestamp: string;
  severity: 'high' | 'medium' | 'low';
  source: '3rdParty' | 'AI' | 'Crowdsourced';
  trustScore: number;
  criticalityScore: number;
  status?: 'pending' | 'approved' | 'rejected';
}

interface RegionFilter {
  searchQuery: string;
  selectedRegions: string[];
  coordinates?: {
    lat: number;
    lng: number;
    radius: number;
  }
}
```

## Implementation Plan for Code Mode

1. Initial Setup
   - Create new admin/forecasts.html template
   - Add route in app.py
   - Create necessary CSS modules

2. Component Development Order
   a. Region Filter Component
      - Search input with autocomplete
      - Filter tags implementation
      - Region selection logic
   
   b. Base Grid Layout
      - Implement responsive grid structure
      - Set up card containers
   
   c. Forecast Card Components
      - Trust score indicator
      - Criticality badge
      - Forecast list container
   
   d. Forecast Item Components
      - Item layout and styling
      - Badge components
      - Action buttons

3. Integration Steps
   - Add API endpoints for data fetching
   - Implement filtering logic
   - Add approval/rejection handlers
   - Set up real-time updates

4. Testing Checklist
   - Responsive layout testing
   - Filter functionality
   - Approval flows
   - Performance testing
   - Cross-browser compatibility