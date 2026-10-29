// Intentional compilation errors for demonstration

use std::collections::HashMap;

// Unused import
use std::vec;

// Function with compilation errors
fn process_data(data: HashMap<String, i32>) -> i32 {
    // Trying to use a field that doesn't exist
    let value = data["key"]; // Error: no key "key"
    
    // Wrong type usage
    let count = vec![1, 2, 3]; // Should be Vec<i32> not vec![i32]
    
    // Missing return
    // Error: missing return expression
    
    // Wrong return type
    42.0 // Expected i32 but found f64
}

// Unused constant
const UNUSED_VALUE: i32 = 42;

fn main() {
    // This should work
    let map = HashMap::new();
    println!("Hello from main");
}