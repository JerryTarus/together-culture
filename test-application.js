// Test script to verify the application functionality
const https = require('http');

async function testApplicationEndpoints() {
    const baseUrl = 'http://localhost:5000';
    
    console.log('🧪 Testing Together Culture CRM Application...\n');
    
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    try {
        const response = await fetch(`${baseUrl}/api/admin/stats`);
        if (response.status === 401) {
            console.log('✅ Server is running (authentication required as expected)');
        } else {
            console.log('⚠️  Server response unexpected:', response.status);
        }
    } catch (error) {
        console.log('❌ Server not accessible:', error.message);
        return;
    }

    // Test 2: Test admin login
    console.log('\n2. Testing admin login...');
    try {
        const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@togetherculture.com',
                password: 'admin123'
            })
        });
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('✅ Admin login successful:', loginData.user.full_name);
        } else {
            console.log('❌ Admin login failed:', await loginResponse.text());
        }
    } catch (error) {
        console.log('❌ Login test failed:', error.message);
    }

    // Test 3: Test member login (approved user)
    console.log('\n3. Testing member login...');
    try {
        const memberLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'sarah.johnson@example.com',
                password: 'password123'
            })
        });
        
        if (memberLoginResponse.ok) {
            const memberData = await memberLoginResponse.json();
            console.log('✅ Member login successful:', memberData.user.full_name, '(Status:', memberData.user.status + ')');
        } else {
            const errorData = await memberLoginResponse.json();
            console.log('⚠️  Member login response:', errorData.message);
        }
    } catch (error) {
        console.log('❌ Member login test failed:', error.message);
    }

    // Test 4: Test pending user login
    console.log('\n4. Testing pending user login...');
    try {
        const pendingLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'david.thompson@example.com',
                password: 'password123'
            })
        });
        
        if (pendingLoginResponse.status === 403) {
            const pendingData = await pendingLoginResponse.json();
            console.log('✅ Pending user correctly blocked:', pendingData.message);
        } else {
            console.log('⚠️  Unexpected pending user response:', pendingLoginResponse.status);
        }
    } catch (error) {
        console.log('❌ Pending user test failed:', error.message);
    }

    console.log('\n🎉 Application testing completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Admin login: admin@togetherculture.com / admin123');
    console.log('✅ Approved member: sarah.johnson@example.com / password123');
    console.log('⏳ Pending member: david.thompson@example.com / password123');
    console.log('❌ Rejected member: james.wilson@example.com / password123');
    console.log('\n🌐 Access the application at: http://localhost:5000');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.log('❌ This test requires Node.js 18+ with fetch support');
    console.log('Please update Node.js or install node-fetch package');
    process.exit(1);
}

// Run tests after a short delay to ensure server is started
setTimeout(testApplicationEndpoints, 3000); 