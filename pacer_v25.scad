// Tinnitus Pacer - V25 Final (10mm Amazon Headband Optimized)
// Design: Organic "Zen Pebble" with Adjustable Tension Slot
$fn = 120;

// Measurements for 10mm Skinny Headbands
lra_d = 10.4;  // Pocket for 10mm LRA Motor
lra_h = 3.9;   // Depth of Motor
band_w = 11.2; // Slot width (gives 1.2mm wiggle room for curve)
band_t = 3.2;  // Slot thickness (fits standard 2mm plastic + tolerance)
skin_gap = 1.5; // Thickness of plastic between motor and skin

body_dia = lra_d + 12;

module pacer_v25() {
    difference() {
        // 1. THE BODY: Ultra-smooth organic hull
        hull() {
            sphere(d=body_dia); // Main housing
            translate([0, 15, 0]) sphere(d=band_w + 6); // Headband neck
        }

        // 2. MOTOR CAVITY: Centered for direct vibration
        cylinder(h=lra_h, d=lra_d, center=true);
        
        // 3. THE ADJUSTMENT TUNNEL: For the 10mm headband
        translate([-band_w/2, 4, -band_t/2]) 
            cube([band_w, 30, band_t]);

        // 4. THE LOCKING PORT: M3 Screw Hole
        translate([0, 18, 0]) rotate([0, 90, 0]) 
            cylinder(h=30, d=2.8, center=true); // 2.8mm for tight M3 threads

        // 5. THE CONTACT FACE: Flattened for skin/bone contact
        // Precisely calculated to maintain the requested skin_gap
        // The cube is translated so its top face sits at -(lra_h/2 + skin_gap)
        translate([0, 0, -(25 + (lra_h/2) + skin_gap)]) 
            cube([50, 50, 50], center=true);
        
        // 6. WIRE CHANNEL: Tiny notch for motor wires
        translate([0, -10, 0]) cube([2, 10, 2], center=true);
    }
}

// Generate the pair (Left and Right are identical for this design)
translate([-18, 0, 0]) pacer_v25();
translate([18, 0, 0]) pacer_v25();