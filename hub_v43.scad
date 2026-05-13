// V43 Hub Chassis - Tiered Internal Layout
module v43_hub() {
    difference() {
        // Outer Shell
        translate([-26, -36, 0]) cube([52, 72, 28]);

        // Main Internal Cavity
        translate([-23, -33, 2]) cube([46, 66, 28]);

        // Tier 1: ESP32 DevKit Deck (Bottom)
        translate([-15, -26, 2]) cube([30, 52, 6]);

        // Tier 2: Component Shelf (Mux & Drivers)
        translate([-21, -31, 12]) cube([42, 30, 6]);

        // Front Port: 3.5mm TRRS Jack Hole
        translate([0, 36, 15]) rotate([90, 0, 0]) cylinder(d=8.5, h=10, $fn=60);

        // Rear Port: USB-C Power Access
        translate([-6, -36, 4]) cube([12, 10, 8]);
    }

    // Mounting Pegs for Boards
    translate([-13, -25, 2]) cylinder(d=2.5, h=4, $fn=20);
    translate([13, -25, 2]) cylinder(d=2.5, h=4, $fn=20);
}

v43_hub();