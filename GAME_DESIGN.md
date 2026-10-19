# Petal Tendril: design notes

**Fantasy:** coaxing a climbing plant up a sunny wall.

**Control:** the tip grows at a steady speed. While a finger is down, the tip turns toward it at a limited rate, and it never points more than 100° from straight up. With no finger, it turns slowly back toward the sun. A dotted line and ring show where you are steering.

**Hazards:** stone (and the garden walls at the sides) and bramble knots stop the vine. Wind bands push it sideways, shown by moving pencil streaks.

**Stars:** reach the light (1), at least two buds in bloom (2), all three (3).

**Fairness:** gardens come from seeded layout rules (gates, stone islands, brambles, wind). A beam-search gardener that only re-decides every 0.15 s must climb each one with all three buds in bloom, or the tests fail.
