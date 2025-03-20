import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCookie } from '../../utils';
import GridItem from '../../components/Grid/GridItem';
import GridContainer from '../../components/Grid/GridContainer';
import Card from '../../components/Card/Card';
import CardHeader from '../../components/Card/CardHeader';
import CardBody from '../../components/Card/CardBody';
// import CardFooter from '../../components/Card/CardFooter';
import Button from '../../components/CustomButtons/Button';
import { FormControl, InputLabel, Input, Typography, Snackbar, CircularProgress } from '@material-ui/core';

const MFASetup = ({ user, onMFAStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  // Using message state instead of separate success/error states
  const [, setSuccess] = useState(false);
  const [, setError] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    if (user && user.mfaEnabled) {
      setMfaEnabled(true);
    }
  }, [user]);

  const handleSetupMFA = async () => {
    setIsLoading(true);
    setError(false);
    setMessage('');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URI}/api/auth/mfa/setup`,
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': getCookie('csrf'),
          },
        }
      );
      
      setSecret(response.data.secret);
      
      // Get QR code
      const qrResponse = await axios.get(
        `${import.meta.env.VITE_API_URI}/api/auth/mfa/qrcode`,
        {
          withCredentials: true,
          headers: {
            'X-CSRF-TOKEN': getCookie('csrf'),
          },
        }
      );
      
      setQrCode(qrResponse.data.qrcode);
      setSetupMode(true);
      setIsLoading(false);
    } catch (error) {
      setError(true);
      setMessage('Failed to setup MFA. Please try again.');
      setIsLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError(true);
      setMessage('Please enter a valid 6-digit verification code');
      return;
    }
    
    setIsLoading(true);
    setError(false);
    setMessage('');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URI}/api/auth/mfa/verify`,
        {
          token: verificationCode
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': getCookie('csrf'),
          },
        }
      );
      
      if (response.data.success) {
        setSuccess(true);
        setMessage('MFA has been successfully enabled!');
        setMfaEnabled(true);
        setSetupMode(false);
        if (onMFAStatusChange) {
          onMFAStatusChange(true);
        }
      }
      setIsLoading(false);
    } catch (error) {
      setError(true);
      setMessage('Invalid verification code. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    setIsLoading(true);
    setError(false);
    setMessage('');
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URI}/api/auth/mfa/disable`,
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': getCookie('csrf'),
          },
        }
      );
      
      if (response.data.success) {
        setSuccess(true);
        setMessage('MFA has been successfully disabled');
        setMfaEnabled(false);
        if (onMFAStatusChange) {
          onMFAStatusChange(false);
        }
      }
      setIsLoading(false);
    } catch (error) {
      setError(true);
      setMessage('Failed to disable MFA. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSetupMode(false);
    setVerificationCode('');
    setQrCode('');
    setSecret('');
  };

  return (
    <Card>
      <Snackbar
        open={!!message}
        message={message}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={5000}
        onClose={() => setMessage('')}
      />
      <CardHeader color="primary">
        <h4>Two-Factor Authentication (2FA)</h4>
      </CardHeader>
      <CardBody>
        {!setupMode ? (
          <GridContainer>
            <GridItem xs={12} sm={12} md={12}>
              <Typography variant="body1" style={{ marginBottom: '16px' }}>
                {mfaEnabled 
                  ? 'Two-factor authentication is currently enabled for your account. This adds an extra layer of security by requiring a verification code from your authenticator app when you log in.'
                  : 'Enhance your account security by enabling two-factor authentication. This requires a verification code from your authenticator app when you log in.'}
              </Typography>
              {!isLoading ? (
                mfaEnabled ? (
                  <Button color="danger" onClick={handleDisableMFA} data-test="disable-mfa">
                    Disable Two-Factor Authentication
                  </Button>
                ) : (
                  <Button color="primary" onClick={handleSetupMFA} data-test="setup-mfa">
                    Enable Two-Factor Authentication
                  </Button>
                )
              ) : (
                <CircularProgress size={24} />
              )}
            </GridItem>
          </GridContainer>
        ) : (
          <GridContainer>
            <GridItem xs={12} sm={12} md={12}>
              <Typography variant="h6" style={{ marginBottom: '16px' }}>
                Set up Two-Factor Authentication
              </Typography>
              <Typography variant="body1" style={{ marginBottom: '16px' }}>
                1. Scan the QR code below with your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).
              </Typography>
              <Typography variant="body1" style={{ marginBottom: '16px' }}>
                2. Enter the 6-digit verification code from your authenticator app below.
              </Typography>
              
              <div style={{ textAlign: 'center', margin: '24px 0' }}>
                {qrCode && <img src={qrCode} alt="QR Code" style={{ maxWidth: '200px' }} />}
              </div>
              
              <Typography variant="body2" style={{ marginBottom: '16px' }}>
                If you cannot scan the QR code, you can manually enter this secret key in your authenticator app:
              </Typography>
              <Typography variant="body2" style={{ 
                marginBottom: '24px', 
                padding: '8px', 
                background: '#f5f5f5', 
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}>
                {secret}
              </Typography>
              
              <FormControl fullWidth style={{ marginBottom: '24px' }}>
                <InputLabel>Verification Code</InputLabel>
                <Input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  inputProps={{ maxLength: 6 }}
                  data-test="verification-code"
                />
              </FormControl>
              
              <div>
                <Button 
                  color="primary" 
                  onClick={handleVerifyMFA} 
                  disabled={isLoading || verificationCode.length !== 6}
                  data-test="verify-mfa"
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Verify and Enable'}
                </Button>
                <Button 
                  color="default" 
                  onClick={handleCancel} 
                  style={{ marginLeft: '8px' }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </GridItem>
          </GridContainer>
        )}
      </CardBody>
    </Card>
  );
};

export default MFASetup;
