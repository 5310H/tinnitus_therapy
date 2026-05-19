// Trahreg Tinnitus Therapy Suite - MSKR Saddle v3.0 (Ergonomic)
// Optimized for Rakklor "Thin-Band" Bone Conduction Headphones

/* 
[3D PRINTING & ASSEMBLY INSTRUCTIONS]

1. Material: PETG (Highly Recommended). PETG provides the necessary flex for the 
   snap-on headband clip and is generally safer for long-term skin contact.
2. Orientation: Lay the part on its side (X-Z plane). This ensures layer lines 
   run the length of the arm for maximum strength and best text/dot clarity.
3. Supports: Enabled. Use "Tree" or "Organic" supports to minimize scarring on 
   anatomical contact surfaces.
4. Perimeters: 3-4 walls. Infill: 30-50% (Gyroid).
5. Layer Height: 0.15mm for optimal capture of tactile identification features.
6. Adhesion: 5-10mm Brim recommended due to narrow contact patch.

[Assembly & Post-Processing]
- Lightly sand the Mastoid Pressure Pad with 400+ grit paper for skin comfort.
- Press-fit the 10mm LRA pancake motor into the pod cavity.
- Route wires through the arm groove and secure via the S-Curve cleat.
- Connect to M5Stack Atom Lite using standard Grove cabling.
*/

// Optimization: Use fa and fs instead of global fn for significantly faster rendering
$fa = 18; // Relaxed for faster build on low-power systems
$fs = 1.0; 

/* [Mechanical Fit] */
// Width of the titanium headband (mm)
band_width = 5.5; // [4.0:0.1:8.0]
// Thickness of the titanium headband (mm)
band_depth = 4.5; // [3.0:0.1:7.0]
// Edge radius for skin comfort (mm)
rounding_r = 2.5; // [1.0:0.1:4.0]
// Length of the connecting arm for different ear sizes (mm)
arm_length = 8.0; // [5.0:0.1:15.0]
// Diameter of the pancake haptic motor (mm)
motor_diameter = 10.0; // [8.0:0.1:12.0]
// Inward angle of the mastoid pad for anatomical fit (degrees)
mastoid_angle = 0; // [0:1:25]

/* [Export Control] */
// Select which part to render for export. "both" is for previewing.
// "left" and "right" will center the part at [0,0,0] for easier slicing.
export_mode = "both"; // ["left": Left Side Only, "right": Right Side Only, "both": Both Sides (Pair)]

// Constants to handle shell quoting issues during automated builds.
// This allows -D export_mode=left (unquoted) to work correctly.
left = "left";
right = "right";
both = "both";

// Safety Check: Ensure parameters are physically possible
assert(rounding_r < 14/2, "rounding_r is too large for the main body width");
assert(arm_length >= 6.0, "arm_length is too short; motor pod will collide with the headband clip");

module visual_warnings() {
    // Only show warnings in preview mode (F5), not in full renders or STL exports
    if ($preview) {
        if (rounding_r > 6.0) {
            color("OrangeRed") translate([0, 0, 25]) rotate([90, 0, 0])
                linear_extrude(0.1) text("⚠️ EDGE RADIUS NEAR LIMIT", size=3, halign="center");
        }
        if (arm_length < 6.5) {
            color("OrangeRed") translate([0, 0, 21]) rotate([90, 0, 0])
                linear_extrude(0.1) text("⚠️ ARM LENGTH NEAR MINIMUM", size=3, halign="center");
        }
    }
}

module smoothed_element(size, r) {
    // Efficient rounded box using cylinders instead of 8 spheres
    hull() for (x=[r, size[0]-r], y=[r, size[1]-r]) translate([x, y, 0]) cylinder(r=r, h=size[2]);
}

module saddle_v3(is_left = true) {
    // Dynamic offsets based on arm length
    arm_end_x = 6 + arm_length;
    pod_x_offset = arm_end_x + 4;
    pad_x_offset = pod_x_offset + 6;

    // --- Main Body (Ergonomic Clip) ---
    difference() {
        // Main rounded block for skin comfort
        translate([-8, -6, -10]) 
            smoothed_element([16, 14, 20], r=rounding_r);

        // Narrowed Cavity specifically for 4-5mm Titanium Bands
        hull() {
            translate([0, 0, -11]) cylinder(d=band_width, h=22);
            translate([0, 2, -11]) cylinder(d=band_width, h=22);
        }

        // Beveled snap-on entry
        translate([-1.5, -10, -11])
            cube([3, 10, 22]);

        // EXTERNAL WIRE RACEWAY (Snap-in)
        // This allows wires from the hub to enter the saddle body
        translate([0, -6.5, 0])
            rotate([0, 90, 0])
                cylinder(d=2.5, h=22, center=true);

        // Identification Marker (Engraved "L" or "R")
        translate([0, 8.05, 0]) // Positioned slightly outside for clean boolean subtraction
            rotate([90, 0, 0])
                if (is_left) {
                    linear_extrude(height = 2, convexity = 4)
                        text("L", size = 7, halign = "center", valign = "center");
                } else {
                    // Compensate for the global mirror applied to the Right unit
                    mirror([1, 0, 0]) 
                        linear_extrude(height = 2, convexity = 4)
                            text("R", size = 7, halign = "center", valign = "center");
                }

        // Tactile Identification Dots (1 for Left, 2 for Right)
        for(i = [0 : (is_left ? 0 : 1)]) {
            translate([(i*4)-2, 8, -6])
                sphere(d=2.2); // Slightly larger for better tactile feel
        }

        // Branding: "TRAHREG" engraved on the bottom face
        translate([0, 0, -10])
            linear_extrude(height = 1, convexity = 4)
                text("TRAHREG", size = 2.5, halign = "center", valign = "center");
     }

    // --- Tapered Connecting Arm ---
    difference() {
        hull() {
            translate([6, 0, 0]) sphere(d=8);
            translate([arm_end_x, 2, 0]) sphere(d=6);
        }
        // Groove along the arm to guide wires to the motor pod
        hull() {
            translate([6, -2, 0]) sphere(d=2.2);
            translate([arm_end_x, 0, 0]) sphere(d=2.2);
        }
     }

    // --- Circular Motor Pod (Optimized for 10mm LRA) ---
    difference() {
        // Spherical housing for anatomical fit against mastoid
        translate([pod_x_offset, 4, 0]) 
            sphere(d=16);

        // Precision circular cavity for 10mm pancake motor
        translate([pod_x_offset, 6, 0])
            rotate([90, 0, 0])
                cylinder(d=motor_diameter + 0.6, h=4.2); // 0.6mm tolerance for press-fit
                
        // Wire exit relief (Subtracted to meet the arm groove)
        translate([pod_x_offset - 2, 2, 0])
            sphere(d=3.5);
            
        // Flat face for efficient bone conduction transfer
        translate([pod_x_offset, 11, 0])
            cube([20, 10, 20], center=true);
    }

    // --- Mastoid Pressure Pad (Adjustable Angle) ---
    // Pivoted around the center of the motor pod mass for a clean mechanical transition
    translate([pod_x_offset, 4, 0])
    rotate([0, 0, mastoid_angle])
    translate([-pod_x_offset, -4, 0])
    difference() {
        translate([pad_x_offset, 2, 0])
        hull() {
            sphere(d=10);
            translate([6, -2, 0]) sphere(d=6);
        }
        
        // Anti-Slip Texture (Micro-dimples on skin contact side)
        for (dx = [pad_x_offset - 2 : 3 : pad_x_offset + 4], dz = [-3:3:3]) {
            translate([dx, 6.5, dz])
                sphere(d=1.2);
        }
    }

    // --- Anti-rotation Tab ---
    // Provides lateral stability against the titanium band
    translate([10, 6, 0])
        hull() {
            sphere(d=3);
            translate([0, 2, 4]) sphere(d=2);
        }

    // --- Headband Wire Clip (Hub Wire Management) ---
    // Secures the main wire traveling along the headphone band
    translate([0, 6, 8])
    difference() {
        sphere(d=7);
        translate([0, 0, 1]) rotate([0, 90, 0]) cylinder(d=2.5, h=10, center=true);
        translate([0, 0, 4]) cube([10, 2, 6], center=true); // Entry slit
    }

    // --- Integrated Cable Relief ---
    translate([0, -5, -8])
    difference() {
        sphere(d=7);
        
        // S-Curve Cleat (Locks wire in place via friction)
        translate([-2, 0, 0]) rotate([0, 90, 0]) cylinder(d=2, h=10, center=true);
        translate([2, 1, 0]) rotate([0, 90, 0]) cylinder(d=2, h=10, center=true);
        
        translate([0, -4, 0]) cube([10, 5, 10], center=true);
    }
}

if (export_mode == "left") {
    color("#00bfa5") saddle_v3(true);
} else if (export_mode == "right") {
    color("#00897b") mirror([1,0,0]) saddle_v3(false);
} else {
    // Default to both sides for preview mode
    color("#00bfa5") translate([-25, 0, 0]) saddle_v3(true);
    color("#00897b") translate([25, 0, 0]) mirror([1,0,0]) saddle_v3(false);
}

// Call visual warnings to display status in preview
visual_warnings();