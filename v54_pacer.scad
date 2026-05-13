// V54-Right Pacer Saddle
// Force-cut version for VG1030001XH

$fn = 80;

difference() {
    // 1. THE OUTER BOX (Rounded for comfort)
    hull() {
        translate([-12, -10, 0]) cylinder(r=3, h=16);
        translate([12, -10, 0])  cylinder(r=3, h=16);
        translate([-12, 10, 0])  cylinder(r=3, h=16);
        translate([12, 10, 0])   cylinder(r=3, h=16);
    }

    // 2. THE MOTOR HOLE (Skin-Side)
    // This creates the "Open" part for the motor
    translate([0, 0, -1]) 
        cylinder(d=10.2, h=5.5);

    // 3. THE CLIPS (The big "C" slot for the earphones)
    // This is how it secures to the battery pod
    translate([-20, -7.5, 4.5]) 
        cube([40, 15, 15]); 

    // 4. WIRE EXIT
    translate([0, -15, 1.5]) 
        cube([3, 20, 5], center=true);

    // 5. TACTILE "R"
    translate([0, 0, 15]) 
        linear_extrude(height = 3) 
            text("R", size=10, font="Arial:style=Bold", halign="center");
}