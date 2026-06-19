#import "ObservabilityLoggerModule.h"

@interface ObservabilityLoggerModule ()
@property (nonatomic, strong) dispatch_queue_t logQueue;
@property (nonatomic, assign) BOOL isCapturing;
@end

@implementation ObservabilityLoggerModule {
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE(ObservabilityLogger)

- (instancetype)init {
  self = [super init];
  if (self) {
    _logQueue = dispatch_queue_create("com.observability.logger", DISPATCH_QUEUE_SERIAL);
    _isCapturing = NO;
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"ObservabilityNativeLog"];
}

- (void)startObserving {
  _hasListeners = YES;
}

- (void)stopObserving {
  _hasListeners = NO;
}

RCT_EXPORT_METHOD(startCapture:(NSDictionary *)options) {
  dispatch_async(self.logQueue, ^{
    if (self.isCapturing) return;
    self.isCapturing = YES;

    // Delegate to Swift LogCapture
    [self startNativeLogCapture:options[@"level"]];
  });
}

RCT_EXPORT_METHOD(stopCapture) {
  dispatch_async(self.logQueue, ^{
    self.isCapturing = NO;
  });
}

- (void)startNativeLogCapture:(NSString *)level {
  // LogCapture.swift handles actual log interception
  // This is called on the serial logQueue
}

- (void)sendLogEvent:(NSString *)message level:(NSString *)level tag:(NSString *)tag {
  if (!_hasListeners || !self.isCapturing) return;

  [self sendEventWithName:@"ObservabilityNativeLog"
                     body:@{
                       @"message": message ?: @"",
                       @"level": level ?: @"info",
                       @"tag": tag ?: @"native",
                       @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
                     }];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeObservabilityLoggerSpecJSI>(params);
}
#endif

@end
