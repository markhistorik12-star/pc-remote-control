// Compilation errors demonstration

use std::collections::HashMap;

pub fn process_data(data: HashMap<String, i32>) -> i32 {
    let count = data.len() as i32;
    count * 2
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_process_data() {
        let mut data = HashMap::new();
        data.insert("test".to_string(), 42);
        let result = process_data(data);
        assert_eq!(result, 84);
    }
}